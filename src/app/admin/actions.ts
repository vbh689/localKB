"use server";

import {
  ContentStatus,
  RevisionEntityType,
  Role,
  UserStatus,
} from "generated/prisma/client";
import { revalidatePath } from "next/cache";
import { redirectWithFeedback } from "@/lib/feedback";
import { db } from "@/lib/db";
import { requireRoles } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  removeDocument,
  syncAllPublishedContent,
  syncArticleDocument,
  syncFaqDocument,
} from "@/lib/search-index";
import { logError } from "@/lib/logger";
import { areTagsEnabled } from "@/lib/features";
import { slugify } from "@/lib/utils";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function getOptionalString(formData: FormData, key: string) {
  const value = getString(formData, key);
  return value.length > 0 ? value : null;
}

function getStringList(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .map((value) => String(value).trim())
    .filter(Boolean);
}

function getStatus(value: string) {
  return value === ContentStatus.PUBLISHED
    ? ContentStatus.PUBLISHED
    : value === ContentStatus.UNPUBLISHED
      ? ContentStatus.UNPUBLISHED
      : ContentStatus.DRAFT;
}

function getPublishedAt(status: ContentStatus) {
  return status === ContentStatus.PUBLISHED ? new Date() : null;
}

function getRedirectTo(formData: FormData, fallback: string) {
  return getString(formData, "redirectTo") || fallback;
}

function shouldManageTags(formData: FormData) {
  return areTagsEnabled && getString(formData, "manageTags") === "1";
}

function getTagConnectInput(formData: FormData) {
  if (!shouldManageTags(formData)) {
    return undefined;
  }

  return {
    connect: getStringList(formData, "tagIds").map((id) => ({ id })),
  };
}

function getTagSetInput(formData: FormData) {
  if (!shouldManageTags(formData)) {
    return undefined;
  }

  return {
    set: getStringList(formData, "tagIds").map((id) => ({ id })),
  };
}

async function ensureUniqueSlug(
  model: "article" | "faq" | "category" | "tag",
  slug: string,
  excludeId?: string,
) {
  if (model === "article") {
    const existing = await db.article.findFirst({
      where: {
        slug,
        id: excludeId ? { not: excludeId } : undefined,
      },
      select: { id: true },
    });

    return !existing;
  }

  if (model === "faq") {
    const existing = await db.faq.findFirst({
      where: {
        slug,
        id: excludeId ? { not: excludeId } : undefined,
      },
      select: { id: true },
    });

    return !existing;
  }

  if (model === "category") {
    const existing = await db.category.findFirst({
      where: {
        slug,
        id: excludeId ? { not: excludeId } : undefined,
      },
      select: { id: true },
    });

    return !existing;
  }

  const existing = await db.tag.findFirst({
    where: {
      slug,
      id: excludeId ? { not: excludeId } : undefined,
    },
    select: { id: true },
  });

  return !existing;
}

function getRole(value: string) {
  return value === Role.ADMIN
    ? Role.ADMIN
    : value === Role.EDITOR
      ? Role.EDITOR
      : Role.VIEWER;
}

function getUserStatus(value: string) {
  return value === UserStatus.INACTIVE ? UserStatus.INACTIVE : UserStatus.ACTIVE;
}

async function ensureAnotherAdminExists(excludedUserId: string) {
  const adminCount = await db.user.count({
    where: {
      role: Role.ADMIN,
      id: {
        not: excludedUserId,
      },
    },
  });

  return adminCount > 0;
}

async function restoreArticleFromRevision(
  articleId: string,
  revisionId: string,
  userId: string,
): Promise<
  | {
      error: string;
    }
  | {
      article: {
        id: string;
        slug: string;
        status: ContentStatus;
        title: string;
      };
    }
> {
  const revision = await db.revision.findFirst({
    where: {
      id: revisionId,
      articleId,
      entityType: RevisionEntityType.ARTICLE,
    },
    select: {
      id: true,
      snapshotBody: true,
      snapshotTitle: true,
    },
  });

  if (!revision) {
    return { error: "Không tìm thấy revision article cần khôi phục." };
  }

  const slug = slugify(revision.snapshotTitle);

  if (!(await ensureUniqueSlug("article", slug, articleId))) {
    return {
      error: "Không thể khôi phục vì tiêu đề snapshot đang trùng với một article khác.",
    };
  }

  const article = await db.article.update({
    where: {
      id: articleId,
    },
    data: {
      body: revision.snapshotBody,
      slug,
      title: revision.snapshotTitle,
      revisions: {
        create: {
          createdById: userId,
          entityType: RevisionEntityType.ARTICLE,
          snapshotBody: revision.snapshotBody,
          snapshotTitle: revision.snapshotTitle,
        },
      },
    },
    select: {
      id: true,
      slug: true,
      status: true,
      title: true,
    },
  });

  return { article };
}

async function restoreFaqFromRevision(
  faqId: string,
  revisionId: string,
  userId: string,
): Promise<
  | {
      error: string;
    }
  | {
      faq: {
        id: string;
        question: string;
        slug: string;
        status: ContentStatus;
      };
    }
> {
  const revision = await db.revision.findFirst({
    where: {
      id: revisionId,
      faqId,
      entityType: RevisionEntityType.FAQ,
    },
    select: {
      id: true,
      snapshotBody: true,
      snapshotTitle: true,
    },
  });

  if (!revision) {
    return { error: "Không tìm thấy revision FAQ cần khôi phục." };
  }

  const slug = slugify(revision.snapshotTitle);

  if (!(await ensureUniqueSlug("faq", slug, faqId))) {
    return {
      error: "Không thể khôi phục vì câu hỏi snapshot đang trùng với một FAQ khác.",
    };
  }

  const faq = await db.faq.update({
    where: {
      id: faqId,
    },
    data: {
      answer: revision.snapshotBody,
      question: revision.snapshotTitle,
      slug,
      revisions: {
        create: {
          createdById: userId,
          entityType: RevisionEntityType.FAQ,
          snapshotBody: revision.snapshotBody,
          snapshotTitle: revision.snapshotTitle,
        },
      },
    },
    select: {
      id: true,
      question: true,
      slug: true,
      status: true,
    },
  });

  return { faq };
}

export async function createUser(formData: FormData) {
  await requireRoles([Role.ADMIN]);
  const redirectTo = getRedirectTo(formData, "/admin/users");
  const email = getString(formData, "email").toLowerCase();
  const password = getString(formData, "password");
  const role = getRole(getString(formData, "role"));
  const status = getUserStatus(getString(formData, "status"));

  if (!email) {
    redirectWithFeedback(redirectTo, {
      message: "Email là bắt buộc.",
      status: "error",
    });
  }

  if (password.length < 8) {
    redirectWithFeedback(redirectTo, {
      message: "Mật khẩu mới phải có ít nhất 8 ký tự.",
      status: "error",
    });
  }

  const existing = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existing) {
    redirectWithFeedback(redirectTo, {
      message: "Email này đã tồn tại trong hệ thống.",
      status: "error",
    });
  }

  await db.user.create({
    data: {
      email,
      passwordHash: await hashPassword(password),
      role,
      status,
    },
  });

  revalidatePath("/admin/users");
  redirectWithFeedback(redirectTo, {
    message: `Đã tạo user ${email}.`,
    status: "success",
  });
}

export async function updateUser(formData: FormData) {
  const session = await requireRoles([Role.ADMIN]);
  const redirectTo = getRedirectTo(formData, "/admin/users");
  const id = getString(formData, "id");
  const email = getString(formData, "email").toLowerCase();
  const password = getString(formData, "password");
  const role = getRole(getString(formData, "role"));
  const status = getUserStatus(getString(formData, "status"));

  if (!id || !email) {
    redirectWithFeedback(redirectTo, {
      message: "Không đủ thông tin để cập nhật user.",
      status: "error",
    });
  }

  if (session.user.id === id && role !== Role.ADMIN) {
    redirectWithFeedback(redirectTo, {
      message: "Bạn không thể tự hạ quyền chính mình khỏi ADMIN.",
      status: "error",
    });
  }

  if (session.user.id === id && status !== UserStatus.ACTIVE) {
    redirectWithFeedback(redirectTo, {
      message: "Bạn không thể tự chuyển tài khoản đang đăng nhập sang Inactive.",
      status: "error",
    });
  }

  const currentUser = await db.user.findUnique({
    where: {
      id,
    },
  });

  if (!currentUser) {
    redirectWithFeedback(redirectTo, {
      message: "Không tìm thấy user cần cập nhật.",
      status: "error",
    });
  }

  if (password.length > 0 && password.length < 8) {
    redirectWithFeedback(redirectTo, {
      message: "Mật khẩu mới phải có ít nhất 8 ký tự.",
      status: "error",
    });
  }

  const emailOwner = await db.user.findFirst({
    where: {
      email,
      id: {
        not: id,
      },
    },
    select: {
      id: true,
    },
  });

  if (emailOwner) {
    redirectWithFeedback(redirectTo, {
      message: "Email này đang thuộc về một user khác.",
      status: "error",
    });
  }

  if (currentUser.role === Role.ADMIN && role !== Role.ADMIN) {
    const hasAnotherAdmin = await ensureAnotherAdminExists(id);

    if (!hasAnotherAdmin) {
      redirectWithFeedback(redirectTo, {
        message: "Không thể hạ quyền admin cuối cùng.",
        status: "error",
      });
    }
  }

  await db.user.update({
    where: {
      id,
    },
    data: {
      email,
      passwordHash:
        password.length >= 8
          ? await hashPassword(password)
          : undefined,
      role,
      status,
    },
  });

  if (status === UserStatus.INACTIVE) {
    await db.session.deleteMany({
      where: {
        userId: id,
      },
    });
  }

  revalidatePath("/admin/users");
  redirectWithFeedback(redirectTo, {
    message: `Đã cập nhật user ${email}.`,
    status: "success",
  });
}

export async function createCategory(formData: FormData) {
  await requireRoles([Role.ADMIN, Role.EDITOR]);
  const redirectTo = getRedirectTo(formData, "/admin/categories");
  const name = getString(formData, "name");

  if (!name) {
    redirectWithFeedback(redirectTo, {
      message: "Tên category là bắt buộc.",
      status: "error",
    });
  }

  const slug = slugify(name);

  if (!(await ensureUniqueSlug("category", slug))) {
    redirectWithFeedback(redirectTo, {
      message: "Category này đã tồn tại.",
      status: "error",
    });
  }

  await db.category.create({
    data: {
      name,
      slug,
    },
  });

  revalidatePath("/admin/categories");
  revalidatePath("/admin/articles");
  revalidatePath("/admin/faqs");
  redirectWithFeedback(redirectTo, {
    message: `Đã tạo category ${name}.`,
    status: "success",
  });
}

export async function updateCategory(formData: FormData) {
  await requireRoles([Role.ADMIN, Role.EDITOR]);
  const redirectTo = getRedirectTo(formData, "/admin/categories");
  const id = getString(formData, "id");
  const name = getString(formData, "name");

  if (!id || !name) {
    redirectWithFeedback(redirectTo, {
      message: "Không đủ thông tin để cập nhật category.",
      status: "error",
    });
  }

  const slug = slugify(name);

  if (!(await ensureUniqueSlug("category", slug, id))) {
    redirectWithFeedback(redirectTo, {
      message: "Category với tên này đã tồn tại.",
      status: "error",
    });
  }

  await db.category.update({
    where: {
      id,
    },
    data: {
      name,
      slug,
    },
  });

  revalidatePath("/admin/categories");
  revalidatePath("/admin/articles");
  revalidatePath("/admin/faqs");
  revalidatePath("/");
  redirectWithFeedback(redirectTo, {
    message: `Đã cập nhật category ${name}.`,
    status: "success",
  });
}

export async function deleteCategory(formData: FormData) {
  await requireRoles([Role.ADMIN, Role.EDITOR]);
  const redirectTo = getRedirectTo(formData, "/admin/categories");
  const id = getString(formData, "id");

  if (!id) {
    redirectWithFeedback(redirectTo, {
      message: "Không tìm thấy category cần xóa.",
      status: "error",
    });
  }

  const category = await db.category.findUnique({
    where: { id },
    select: { name: true },
  });

  if (!category) {
    redirectWithFeedback(redirectTo, {
      message: "Category không tồn tại.",
      status: "error",
    });
  }

  await db.category.delete({
    where: {
      id,
    },
  });

  revalidatePath("/admin/categories");
  revalidatePath("/admin/articles");
  revalidatePath("/admin/faqs");
  redirectWithFeedback(redirectTo, {
    message: `Đã xóa category ${category.name}.`,
    status: "success",
  });
}

export async function createTag(formData: FormData) {
  await requireRoles([Role.ADMIN, Role.EDITOR]);
  const redirectTo = getRedirectTo(formData, "/admin/tags");
  const name = getString(formData, "name");

  if (!name) {
    redirectWithFeedback(redirectTo, {
      message: "Tên tag là bắt buộc.",
      status: "error",
    });
  }

  const slug = slugify(name);

  if (!(await ensureUniqueSlug("tag", slug))) {
    redirectWithFeedback(redirectTo, {
      message: "Tag này đã tồn tại.",
      status: "error",
    });
  }

  await db.tag.create({
    data: {
      name,
      slug,
    },
  });

  revalidatePath("/admin/tags");
  revalidatePath("/admin/articles");
  revalidatePath("/admin/faqs");
  redirectWithFeedback(redirectTo, {
    message: `Đã tạo tag ${name}.`,
    status: "success",
  });
}

export async function updateTag(formData: FormData) {
  await requireRoles([Role.ADMIN, Role.EDITOR]);
  const redirectTo = getRedirectTo(formData, "/admin/tags");
  const id = getString(formData, "id");
  const name = getString(formData, "name");

  if (!id || !name) {
    redirectWithFeedback(redirectTo, {
      message: "Không đủ thông tin để cập nhật tag.",
      status: "error",
    });
  }

  const slug = slugify(name);

  if (!(await ensureUniqueSlug("tag", slug, id))) {
    redirectWithFeedback(redirectTo, {
      message: "Tag với tên này đã tồn tại.",
      status: "error",
    });
  }

  await db.tag.update({
    where: {
      id,
    },
    data: {
      name,
      slug,
    },
  });

  revalidatePath("/admin/tags");
  revalidatePath("/admin/articles");
  revalidatePath("/admin/faqs");
  revalidatePath("/");
  redirectWithFeedback(redirectTo, {
    message: `Đã cập nhật tag ${name}.`,
    status: "success",
  });
}

export async function deleteTag(formData: FormData) {
  await requireRoles([Role.ADMIN, Role.EDITOR]);
  const redirectTo = getRedirectTo(formData, "/admin/tags");
  const id = getString(formData, "id");

  if (!id) {
    redirectWithFeedback(redirectTo, {
      message: "Không tìm thấy tag cần xóa.",
      status: "error",
    });
  }

  const tag = await db.tag.findUnique({
    where: { id },
    select: { name: true },
  });

  if (!tag) {
    redirectWithFeedback(redirectTo, {
      message: "Tag không tồn tại.",
      status: "error",
    });
  }

  await db.tag.delete({
    where: {
      id,
    },
  });

  revalidatePath("/admin/tags");
  revalidatePath("/admin/articles");
  revalidatePath("/admin/faqs");
  redirectWithFeedback(redirectTo, {
    message: `Đã xóa tag ${tag.name}.`,
    status: "success",
  });
}

export async function createArticle(formData: FormData) {
  const session = await requireRoles([Role.ADMIN, Role.EDITOR]);
  const redirectTo = getRedirectTo(formData, "/admin/articles");
  const title = getString(formData, "title");
  const body = getString(formData, "body");
  const categoryId = getOptionalString(formData, "categoryId");
  const status = getStatus(getString(formData, "status"));
  const tagConnectInput = getTagConnectInput(formData);

  if (!title || !body) {
    redirectWithFeedback(redirectTo, {
      message: "Title và body đều là bắt buộc.",
      status: "error",
    });
  }

  const slug = slugify(title);

  if (!(await ensureUniqueSlug("article", slug))) {
    redirectWithFeedback(redirectTo, {
      message: "Article với tiêu đề này đã tồn tại.",
      status: "error",
    });
  }

  const article = await db.article.create({
    data: {
      authorId: session.user.id,
      body,
      categoryId,
      publishedAt: getPublishedAt(status),
      slug,
      status,
      ...(tagConnectInput ? { tags: tagConnectInput } : {}),
      title,
      ...(status === ContentStatus.PUBLISHED
        ? {
            revisions: {
              create: {
                createdById: session.user.id,
                entityType: RevisionEntityType.ARTICLE,
                snapshotBody: body,
                snapshotTitle: title,
              },
            },
          }
        : {}),
    },
  });

  if (status === ContentStatus.PUBLISHED) {
    await syncArticleDocument(article.id);
  }

  revalidatePath("/admin/articles");
  revalidatePath("/");
  revalidatePath("/search");
  redirectWithFeedback(redirectTo, {
    message: `Đã tạo article ${title}.`,
    status: "success",
  });
}

export async function deleteArticle(formData: FormData) {
  await requireRoles([Role.ADMIN, Role.EDITOR]);
  const redirectTo = getRedirectTo(formData, "/admin/articles");
  const id = getString(formData, "id");

  if (!id) {
    redirectWithFeedback(redirectTo, {
      message: "Không tìm thấy article cần xóa.",
      status: "error",
    });
  }

  const article = await db.article.findUnique({
    where: { id },
    select: { title: true },
  });

  if (!article) {
    redirectWithFeedback(redirectTo, {
      message: "Article không tồn tại.",
      status: "error",
    });
  }

  await db.article.delete({
    where: {
      id,
    },
  });

  await removeDocument(`article_${id}`);

  revalidatePath("/admin/articles");
  revalidatePath("/");
  revalidatePath("/search");
  redirectWithFeedback(redirectTo, {
    message: `Đã xóa article ${article.title}.`,
    status: "success",
  });
}

export async function updateArticleStatus(formData: FormData) {
  const session = await requireRoles([Role.ADMIN, Role.EDITOR]);
  const redirectTo = getRedirectTo(formData, "/admin/articles");
  const id = getString(formData, "id");
  const status = getStatus(getString(formData, "status"));

  if (!id) {
    redirectWithFeedback(redirectTo, {
      message: "Không tìm thấy article cần cập nhật trạng thái.",
      status: "error",
    });
  }

  const article = await db.article.update({
    where: {
      id,
    },
    data: {
      publishedAt: getPublishedAt(status),
      status,
    },
  });

  if (status === ContentStatus.PUBLISHED) {
    await db.revision.create({
      data: {
        articleId: article.id,
        createdById: session.user.id,
        entityType: RevisionEntityType.ARTICLE,
        snapshotBody: article.body,
        snapshotTitle: article.title,
      },
    });
  }

  await syncArticleDocument(article.id);

  revalidatePath("/admin/articles");
  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath("/kb");
  redirectWithFeedback(redirectTo, {
    message: `Đã cập nhật trạng thái article ${article.title} sang ${status}.`,
    status: "success",
  });
}

export async function updateArticle(formData: FormData) {
  const session = await requireRoles([Role.ADMIN, Role.EDITOR]);
  const redirectTo = getRedirectTo(formData, "/admin/articles");
  const id = getString(formData, "id");
  const title = getString(formData, "title");
  const body = getString(formData, "body");
  const categoryId = getOptionalString(formData, "categoryId");
  const status = getStatus(getString(formData, "status"));
  const tagSetInput = getTagSetInput(formData);

  if (!id || !title || !body) {
    redirectWithFeedback(redirectTo, {
      message: "Không đủ thông tin để cập nhật article.",
      status: "error",
    });
  }

  const slug = slugify(title);

  if (!(await ensureUniqueSlug("article", slug, id))) {
    redirectWithFeedback(redirectTo, {
      message: "Article với tiêu đề này đã tồn tại.",
      status: "error",
    });
  }

  const article = await db.article.update({
    where: {
      id,
    },
    data: {
      body,
      categoryId,
      publishedAt: getPublishedAt(status),
      slug,
      status,
      ...(tagSetInput ? { tags: tagSetInput } : {}),
      title,
    },
  });

  if (status === ContentStatus.PUBLISHED) {
    await db.revision.create({
      data: {
        articleId: article.id,
        createdById: session.user.id,
        entityType: RevisionEntityType.ARTICLE,
        snapshotBody: article.body,
        snapshotTitle: article.title,
      },
    });
  }

  await syncArticleDocument(article.id);

  revalidatePath("/admin/articles");
  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath(`/kb/${article.slug}`);
  redirectWithFeedback(redirectTo, {
    message: `Đã cập nhật article ${article.title}.`,
    status: "success",
  });
}

export async function restoreArticleRevision(formData: FormData) {
  const session = await requireRoles([Role.ADMIN, Role.EDITOR]);
  const redirectTo = getRedirectTo(formData, "/admin/articles");
  const articleId = getString(formData, "articleId");
  const revisionId = getString(formData, "revisionId");
  const currentSlug = getString(formData, "currentSlug");

  if (!articleId || !revisionId) {
    redirectWithFeedback(redirectTo, {
      message: "Không đủ thông tin để khôi phục article revision.",
      status: "error",
    });
  }

  const result = await restoreArticleFromRevision(
    articleId,
    revisionId,
    session.user.id,
  );

  if ("error" in result) {
    redirectWithFeedback(redirectTo, {
      message: result.error,
      status: "error",
    });
  }

  if (result.article.status === ContentStatus.PUBLISHED) {
    await syncArticleDocument(result.article.id);
  }

  revalidatePath("/admin/articles");
  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath(`/kb/${currentSlug}`);
  revalidatePath(`/kb/${result.article.slug}`);
  redirectWithFeedback(redirectTo, {
    message: `Đã khôi phục article ${result.article.title} từ revision cũ.`,
    status: "success",
  });
}

export async function bulkUpdateArticles(formData: FormData) {
  const session = await requireRoles([Role.ADMIN, Role.EDITOR]);
  const redirectTo = getRedirectTo(formData, "/admin/articles");
  const operation = getString(formData, "operation");
  const ids = getStringList(formData, "ids");

  if (ids.length === 0) {
    redirectWithFeedback(redirectTo, {
      message: "Hãy chọn ít nhất một article để thao tác.",
      status: "error",
    });
  }

  const articles = await db.article.findMany({
    where: {
      id: {
        in: ids,
      },
    },
    select: {
      body: true,
      id: true,
      slug: true,
      title: true,
    },
  });

  if (articles.length === 0) {
    redirectWithFeedback(redirectTo, {
      message: "Không tìm thấy article nào hợp lệ để thao tác.",
      status: "error",
    });
  }

  if (operation === "delete") {
    await db.article.deleteMany({
      where: {
        id: {
          in: articles.map((article) => article.id),
        },
      },
    });

    await Promise.all(
      articles.map((article) => removeDocument(`article_${article.id}`)),
    );

    revalidatePath("/admin/articles");
    revalidatePath("/");
    revalidatePath("/search");
    redirectWithFeedback(redirectTo, {
      message: `Đã xóa ${articles.length} article.`,
      status: "success",
    });
  }

  if (operation !== "publish" && operation !== "unpublish") {
    redirectWithFeedback(redirectTo, {
      message: "Bulk action article không hợp lệ.",
      status: "error",
    });
  }

  const status =
    operation === "publish" ? ContentStatus.PUBLISHED : ContentStatus.UNPUBLISHED;

  for (const article of articles) {
    await db.article.update({
      where: {
        id: article.id,
      },
      data: {
        publishedAt: getPublishedAt(status),
        status,
        ...(status === ContentStatus.PUBLISHED
          ? {
              revisions: {
                create: {
                  createdById: session.user.id,
                  entityType: RevisionEntityType.ARTICLE,
                  snapshotBody: article.body,
                  snapshotTitle: article.title,
                },
              },
            }
          : {}),
      },
    });

    await syncArticleDocument(article.id);
    revalidatePath(`/kb/${article.slug}`);
  }

  revalidatePath("/admin/articles");
  revalidatePath("/");
  revalidatePath("/search");
  redirectWithFeedback(redirectTo, {
    message: `Đã ${operation === "publish" ? "xuất bản" : "ẩn"} ${articles.length} article.`,
    status: "success",
  });
}

export async function createFaq(formData: FormData) {
  const session = await requireRoles([Role.ADMIN, Role.EDITOR]);
  const redirectTo = getRedirectTo(formData, "/admin/faqs");
  const question = getString(formData, "question");
  const answer = getString(formData, "answer");
  const categoryId = getOptionalString(formData, "categoryId");
  const status = getStatus(getString(formData, "status"));
  const tagConnectInput = getTagConnectInput(formData);

  if (!question || !answer) {
    redirectWithFeedback(redirectTo, {
      message: "Question và answer đều là bắt buộc.",
      status: "error",
    });
  }

  const slug = slugify(question);

  if (!(await ensureUniqueSlug("faq", slug))) {
    redirectWithFeedback(redirectTo, {
      message: "FAQ với câu hỏi này đã tồn tại.",
      status: "error",
    });
  }

  const faq = await db.faq.create({
    data: {
      answer,
      categoryId,
      publishedAt: getPublishedAt(status),
      question,
      slug,
      status,
      ...(tagConnectInput ? { tags: tagConnectInput } : {}),
      ...(status === ContentStatus.PUBLISHED
        ? {
            revisions: {
              create: {
                createdById: session.user.id,
                entityType: RevisionEntityType.FAQ,
                snapshotBody: answer,
                snapshotTitle: question,
              },
            },
          }
        : {}),
    },
  });

  if (status === ContentStatus.PUBLISHED) {
    await syncFaqDocument(faq.id);
  }

  revalidatePath("/admin/faqs");
  revalidatePath("/");
  revalidatePath("/faq");
  revalidatePath("/search");
  redirectWithFeedback(redirectTo, {
    message: `Đã tạo FAQ ${question}.`,
    status: "success",
  });
}

export async function deleteFaq(formData: FormData) {
  await requireRoles([Role.ADMIN, Role.EDITOR]);
  const redirectTo = getRedirectTo(formData, "/admin/faqs");
  const id = getString(formData, "id");

  if (!id) {
    redirectWithFeedback(redirectTo, {
      message: "Không tìm thấy FAQ cần xóa.",
      status: "error",
    });
  }

  const faq = await db.faq.findUnique({
    where: { id },
    select: { question: true },
  });

  if (!faq) {
    redirectWithFeedback(redirectTo, {
      message: "FAQ không tồn tại.",
      status: "error",
    });
  }

  await db.faq.delete({
    where: {
      id,
    },
  });

  await removeDocument(`faq_${id}`);

  revalidatePath("/admin/faqs");
  revalidatePath("/");
  revalidatePath("/faq");
  revalidatePath("/search");
  redirectWithFeedback(redirectTo, {
    message: `Đã xóa FAQ ${faq.question}.`,
    status: "success",
  });
}

export async function updateFaqStatus(formData: FormData) {
  const session = await requireRoles([Role.ADMIN, Role.EDITOR]);
  const redirectTo = getRedirectTo(formData, "/admin/faqs");
  const id = getString(formData, "id");
  const status = getStatus(getString(formData, "status"));

  if (!id) {
    redirectWithFeedback(redirectTo, {
      message: "Không tìm thấy FAQ cần cập nhật trạng thái.",
      status: "error",
    });
  }

  const faq = await db.faq.update({
    where: {
      id,
    },
    data: {
      publishedAt: getPublishedAt(status),
      status,
    },
  });

  if (status === ContentStatus.PUBLISHED) {
    await db.revision.create({
      data: {
        createdById: session.user.id,
        entityType: RevisionEntityType.FAQ,
        faqId: faq.id,
        snapshotBody: faq.answer,
        snapshotTitle: faq.question,
      },
    });
  }

  await syncFaqDocument(faq.id);

  revalidatePath("/admin/faqs");
  revalidatePath("/");
  revalidatePath("/faq");
  revalidatePath("/search");
  redirectWithFeedback(redirectTo, {
    message: `Đã cập nhật trạng thái FAQ ${faq.question} sang ${status}.`,
    status: "success",
  });
}

export async function updateFaq(formData: FormData) {
  const session = await requireRoles([Role.ADMIN, Role.EDITOR]);
  const redirectTo = getRedirectTo(formData, "/admin/faqs");
  const id = getString(formData, "id");
  const question = getString(formData, "question");
  const answer = getString(formData, "answer");
  const categoryId = getOptionalString(formData, "categoryId");
  const status = getStatus(getString(formData, "status"));
  const tagSetInput = getTagSetInput(formData);

  if (!id || !question || !answer) {
    redirectWithFeedback(redirectTo, {
      message: "Không đủ thông tin để cập nhật FAQ.",
      status: "error",
    });
  }

  const slug = slugify(question);

  if (!(await ensureUniqueSlug("faq", slug, id))) {
    redirectWithFeedback(redirectTo, {
      message: "FAQ với câu hỏi này đã tồn tại.",
      status: "error",
    });
  }

  const faq = await db.faq.update({
    where: {
      id,
    },
    data: {
      answer,
      categoryId,
      publishedAt: getPublishedAt(status),
      question,
      slug,
      status,
      ...(tagSetInput ? { tags: tagSetInput } : {}),
    },
  });

  if (status === ContentStatus.PUBLISHED) {
    await db.revision.create({
      data: {
        createdById: session.user.id,
        entityType: RevisionEntityType.FAQ,
        faqId: faq.id,
        snapshotBody: faq.answer,
        snapshotTitle: faq.question,
      },
    });
  }

  await syncFaqDocument(faq.id);

  revalidatePath("/admin/faqs");
  revalidatePath("/");
  revalidatePath("/faq");
  revalidatePath("/search");
  revalidatePath(`/faq/${faq.slug}`);
  redirectWithFeedback(redirectTo, {
    message: `Đã cập nhật FAQ ${faq.question}.`,
    status: "success",
  });
}

export async function restoreFaqRevision(formData: FormData) {
  const session = await requireRoles([Role.ADMIN, Role.EDITOR]);
  const redirectTo = getRedirectTo(formData, "/admin/faqs");
  const faqId = getString(formData, "faqId");
  const revisionId = getString(formData, "revisionId");
  const currentSlug = getString(formData, "currentSlug");

  if (!faqId || !revisionId) {
    redirectWithFeedback(redirectTo, {
      message: "Không đủ thông tin để khôi phục FAQ revision.",
      status: "error",
    });
  }

  const result = await restoreFaqFromRevision(
    faqId,
    revisionId,
    session.user.id,
  );

  if ("error" in result) {
    redirectWithFeedback(redirectTo, {
      message: result.error,
      status: "error",
    });
  }

  if (result.faq.status === ContentStatus.PUBLISHED) {
    await syncFaqDocument(result.faq.id);
  }

  revalidatePath("/admin/faqs");
  revalidatePath("/");
  revalidatePath("/faq");
  revalidatePath("/search");
  revalidatePath(`/faq/${currentSlug}`);
  revalidatePath(`/faq/${result.faq.slug}`);
  redirectWithFeedback(redirectTo, {
    message: `Đã khôi phục FAQ ${result.faq.question} từ revision cũ.`,
    status: "success",
  });
}

export async function bulkUpdateFaqs(formData: FormData) {
  const session = await requireRoles([Role.ADMIN, Role.EDITOR]);
  const redirectTo = getRedirectTo(formData, "/admin/faqs");
  const operation = getString(formData, "operation");
  const ids = getStringList(formData, "ids");

  if (ids.length === 0) {
    redirectWithFeedback(redirectTo, {
      message: "Hãy chọn ít nhất một FAQ để thao tác.",
      status: "error",
    });
  }

  const faqs = await db.faq.findMany({
    where: {
      id: {
        in: ids,
      },
    },
    select: {
      answer: true,
      id: true,
      question: true,
      slug: true,
    },
  });

  if (faqs.length === 0) {
    redirectWithFeedback(redirectTo, {
      message: "Không tìm thấy FAQ nào hợp lệ để thao tác.",
      status: "error",
    });
  }

  if (operation === "delete") {
    await db.faq.deleteMany({
      where: {
        id: {
          in: faqs.map((faq) => faq.id),
        },
      },
    });

    await Promise.all(faqs.map((faq) => removeDocument(`faq_${faq.id}`)));

    revalidatePath("/admin/faqs");
    revalidatePath("/");
    revalidatePath("/faq");
    revalidatePath("/search");
    redirectWithFeedback(redirectTo, {
      message: `Đã xóa ${faqs.length} FAQ.`,
      status: "success",
    });
  }

  if (operation !== "publish" && operation !== "unpublish") {
    redirectWithFeedback(redirectTo, {
      message: "Bulk action FAQ không hợp lệ.",
      status: "error",
    });
  }

  const status =
    operation === "publish" ? ContentStatus.PUBLISHED : ContentStatus.UNPUBLISHED;

  for (const faq of faqs) {
    await db.faq.update({
      where: {
        id: faq.id,
      },
      data: {
        publishedAt: getPublishedAt(status),
        status,
        ...(status === ContentStatus.PUBLISHED
          ? {
              revisions: {
                create: {
                  createdById: session.user.id,
                  entityType: RevisionEntityType.FAQ,
                  snapshotBody: faq.answer,
                  snapshotTitle: faq.question,
                },
              },
            }
          : {}),
      },
    });

    await syncFaqDocument(faq.id);
    revalidatePath(`/faq/${faq.slug}`);
  }

  revalidatePath("/admin/faqs");
  revalidatePath("/");
  revalidatePath("/faq");
  revalidatePath("/search");
  redirectWithFeedback(redirectTo, {
    message: `Đã ${operation === "publish" ? "xuất bản" : "ẩn"} ${faqs.length} FAQ.`,
    status: "success",
  });
}

export async function changeOwnPassword(formData: FormData) {
  const session = await requireRoles([Role.ADMIN, Role.EDITOR, Role.VIEWER]);
  const redirectTo = getRedirectTo(formData, "/account/password");
  const currentPassword = getString(formData, "currentPassword");
  const nextPassword = getString(formData, "nextPassword");
  const confirmPassword = getString(formData, "confirmPassword");

  if (
    currentPassword.length < 8 ||
    nextPassword.length < 8 ||
    confirmPassword.length < 8
  ) {
    redirectWithFeedback(redirectTo, {
      message: "Tất cả trường mật khẩu cần ít nhất 8 ký tự.",
      status: "error",
    });
  }

  if (nextPassword !== confirmPassword) {
    redirectWithFeedback(redirectTo, {
      message: "Xác nhận mật khẩu mới không khớp.",
      status: "error",
    });
  }

  const user = await db.user.findUnique({
    where: {
      id: session.user.id,
    },
  });

  if (!user) {
    redirectWithFeedback(redirectTo, {
      message: "Không tìm thấy tài khoản hiện tại.",
      status: "error",
    });
  }

  const isCurrentPasswordValid = await verifyPassword(
    user.passwordHash,
    currentPassword,
  );

  if (!isCurrentPasswordValid) {
    redirectWithFeedback(redirectTo, {
      message: "Mật khẩu hiện tại không đúng.",
      status: "error",
    });
  }

  if (currentPassword === nextPassword) {
    redirectWithFeedback(redirectTo, {
      message: "Mật khẩu mới phải khác mật khẩu hiện tại.",
      status: "error",
    });
  }

  await db.user.update({
    where: {
      id: user.id,
    },
    data: {
      passwordHash: await hashPassword(nextPassword),
    },
  });

  await db.session.deleteMany({
    where: {
      userId: user.id,
      id: {
        not: session.id,
      },
    },
  });

  redirectWithFeedback(redirectTo, {
    message: "Đã cập nhật mật khẩu thành công.",
    status: "success",
  });
}

export async function rebuildSearchIndex(formData: FormData) {
  await requireRoles([Role.ADMIN, Role.EDITOR]);
  const redirectTo = getRedirectTo(formData, "/admin");

  try {
    await syncAllPublishedContent();
  } catch (error) {
    logError("admin.reindex", "Search index rebuild failed.", error);

    redirectWithFeedback(redirectTo, {
      message: "Rebuild search index thất bại. Vui lòng thử lại.",
      status: "error",
    });
  }

  redirectWithFeedback(redirectTo, {
    message: "Đã rebuild search index thành công.",
    status: "success",
  });
}
