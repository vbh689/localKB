"use server";

import { ContentStatus, RevisionEntityType, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirectWithFeedback } from "@/lib/feedback";
import { db } from "@/lib/db";
import { requireRoles } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  removeDocument,
  syncArticleDocument,
  syncFaqDocument,
} from "@/lib/search-index";
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
    return { error: "Khong tim thay revision article can khoi phuc." };
  }

  const slug = slugify(revision.snapshotTitle);

  if (!(await ensureUniqueSlug("article", slug, articleId))) {
    return {
      error: "Khong the restore vi tieu de snapshot dang trung voi mot article khac.",
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
    return { error: "Khong tim thay revision FAQ can khoi phuc." };
  }

  const slug = slugify(revision.snapshotTitle);

  if (!(await ensureUniqueSlug("faq", slug, faqId))) {
    return {
      error: "Khong the restore vi cau hoi snapshot dang trung voi mot FAQ khac.",
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

  if (!email) {
    redirectWithFeedback(redirectTo, {
      message: "Email la bat buoc.",
      status: "error",
    });
  }

  if (password.length < 8) {
    redirectWithFeedback(redirectTo, {
      message: "Mat khau moi phai co it nhat 8 ky tu.",
      status: "error",
    });
  }

  const existing = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existing) {
    redirectWithFeedback(redirectTo, {
      message: "Email nay da ton tai trong he thong.",
      status: "error",
    });
  }

  await db.user.create({
    data: {
      email,
      passwordHash: await hashPassword(password),
      role,
    },
  });

  revalidatePath("/admin/users");
  redirectWithFeedback(redirectTo, {
    message: `Da tao user ${email}.`,
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

  if (!id || !email) {
    redirectWithFeedback(redirectTo, {
      message: "Khong du thong tin de cap nhat user.",
      status: "error",
    });
  }

  if (session.user.id === id && role !== Role.ADMIN) {
    redirectWithFeedback(redirectTo, {
      message: "Ban khong the tu ha quyen chinh minh khoi ADMIN.",
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
      message: "Khong tim thay user can cap nhat.",
      status: "error",
    });
  }

  if (password.length > 0 && password.length < 8) {
    redirectWithFeedback(redirectTo, {
      message: "Mat khau moi phai co it nhat 8 ky tu.",
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
      message: "Email nay dang thuoc ve mot user khac.",
      status: "error",
    });
  }

  if (currentUser.role === Role.ADMIN && role !== Role.ADMIN) {
    const hasAnotherAdmin = await ensureAnotherAdminExists(id);

    if (!hasAnotherAdmin) {
      redirectWithFeedback(redirectTo, {
        message: "Khong the ha quyen admin cuoi cung.",
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
    },
  });

  revalidatePath("/admin/users");
  redirectWithFeedback(redirectTo, {
    message: `Da cap nhat user ${email}.`,
    status: "success",
  });
}

export async function deleteUser(formData: FormData) {
  const session = await requireRoles([Role.ADMIN]);
  const redirectTo = getRedirectTo(formData, "/admin/users");
  const id = getString(formData, "id");

  if (!id || id === session.user.id) {
    redirectWithFeedback(redirectTo, {
      message: "Ban khong the xoa tai khoan dang dang nhap.",
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
      message: "Khong tim thay user can xoa.",
      status: "error",
    });
  }

  if (currentUser.role === Role.ADMIN) {
    const hasAnotherAdmin = await ensureAnotherAdminExists(id);

    if (!hasAnotherAdmin) {
      redirectWithFeedback(redirectTo, {
        message: "Khong the xoa admin cuoi cung.",
        status: "error",
      });
    }
  }

  await db.session.deleteMany({
    where: {
      userId: id,
    },
  });

  await db.user.delete({
    where: {
      id,
    },
  });

  revalidatePath("/admin/users");
  redirectWithFeedback(redirectTo, {
    message: `Da xoa user ${currentUser.email}.`,
    status: "success",
  });
}

export async function createCategory(formData: FormData) {
  await requireRoles([Role.ADMIN, Role.EDITOR]);
  const redirectTo = getRedirectTo(formData, "/admin/categories");
  const name = getString(formData, "name");

  if (!name) {
    redirectWithFeedback(redirectTo, {
      message: "Ten category la bat buoc.",
      status: "error",
    });
  }

  const slug = slugify(name);

  if (!(await ensureUniqueSlug("category", slug))) {
    redirectWithFeedback(redirectTo, {
      message: "Category nay da ton tai.",
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
    message: `Da tao category ${name}.`,
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
      message: "Khong du thong tin de cap nhat category.",
      status: "error",
    });
  }

  const slug = slugify(name);

  if (!(await ensureUniqueSlug("category", slug, id))) {
    redirectWithFeedback(redirectTo, {
      message: "Category voi ten nay da ton tai.",
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
    message: `Da cap nhat category ${name}.`,
    status: "success",
  });
}

export async function deleteCategory(formData: FormData) {
  await requireRoles([Role.ADMIN, Role.EDITOR]);
  const redirectTo = getRedirectTo(formData, "/admin/categories");
  const id = getString(formData, "id");

  if (!id) {
    redirectWithFeedback(redirectTo, {
      message: "Khong tim thay category can xoa.",
      status: "error",
    });
  }

  const category = await db.category.findUnique({
    where: { id },
    select: { name: true },
  });

  if (!category) {
    redirectWithFeedback(redirectTo, {
      message: "Category khong ton tai.",
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
    message: `Da xoa category ${category.name}.`,
    status: "success",
  });
}

export async function createTag(formData: FormData) {
  await requireRoles([Role.ADMIN, Role.EDITOR]);
  const redirectTo = getRedirectTo(formData, "/admin/tags");
  const name = getString(formData, "name");

  if (!name) {
    redirectWithFeedback(redirectTo, {
      message: "Ten tag la bat buoc.",
      status: "error",
    });
  }

  const slug = slugify(name);

  if (!(await ensureUniqueSlug("tag", slug))) {
    redirectWithFeedback(redirectTo, {
      message: "Tag nay da ton tai.",
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
    message: `Da tao tag ${name}.`,
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
      message: "Khong du thong tin de cap nhat tag.",
      status: "error",
    });
  }

  const slug = slugify(name);

  if (!(await ensureUniqueSlug("tag", slug, id))) {
    redirectWithFeedback(redirectTo, {
      message: "Tag voi ten nay da ton tai.",
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
    message: `Da cap nhat tag ${name}.`,
    status: "success",
  });
}

export async function deleteTag(formData: FormData) {
  await requireRoles([Role.ADMIN, Role.EDITOR]);
  const redirectTo = getRedirectTo(formData, "/admin/tags");
  const id = getString(formData, "id");

  if (!id) {
    redirectWithFeedback(redirectTo, {
      message: "Khong tim thay tag can xoa.",
      status: "error",
    });
  }

  const tag = await db.tag.findUnique({
    where: { id },
    select: { name: true },
  });

  if (!tag) {
    redirectWithFeedback(redirectTo, {
      message: "Tag khong ton tai.",
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
    message: `Da xoa tag ${tag.name}.`,
    status: "success",
  });
}

export async function createArticle(formData: FormData) {
  const session = await requireRoles([Role.ADMIN, Role.EDITOR]);
  const redirectTo = getRedirectTo(formData, "/admin/articles");
  const title = getString(formData, "title");
  const summary = getString(formData, "summary");
  const body = getString(formData, "body");
  const categoryId = getOptionalString(formData, "categoryId");
  const tagIds = formData
    .getAll("tagIds")
    .map((value) => String(value))
    .filter(Boolean);
  const status = getStatus(getString(formData, "status"));

  if (!title || !summary || !body) {
    redirectWithFeedback(redirectTo, {
      message: "Title, summary va body deu la bat buoc.",
      status: "error",
    });
  }

  const slug = slugify(title);

  if (!(await ensureUniqueSlug("article", slug))) {
    redirectWithFeedback(redirectTo, {
      message: "Article voi tieu de nay da ton tai.",
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
      summary,
      tags: {
        connect: tagIds.map((id) => ({ id })),
      },
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
    message: `Da tao article ${title}.`,
    status: "success",
  });
}

export async function deleteArticle(formData: FormData) {
  await requireRoles([Role.ADMIN, Role.EDITOR]);
  const redirectTo = getRedirectTo(formData, "/admin/articles");
  const id = getString(formData, "id");

  if (!id) {
    redirectWithFeedback(redirectTo, {
      message: "Khong tim thay article can xoa.",
      status: "error",
    });
  }

  const article = await db.article.findUnique({
    where: { id },
    select: { title: true },
  });

  if (!article) {
    redirectWithFeedback(redirectTo, {
      message: "Article khong ton tai.",
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
    message: `Da xoa article ${article.title}.`,
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
      message: "Khong tim thay article can cap nhat trang thai.",
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
    message: `Da cap nhat trang thai article ${article.title} sang ${status}.`,
    status: "success",
  });
}

export async function updateArticle(formData: FormData) {
  const session = await requireRoles([Role.ADMIN, Role.EDITOR]);
  const redirectTo = getRedirectTo(formData, "/admin/articles");
  const id = getString(formData, "id");
  const title = getString(formData, "title");
  const summary = getString(formData, "summary");
  const body = getString(formData, "body");
  const categoryId = getOptionalString(formData, "categoryId");
  const status = getStatus(getString(formData, "status"));
  const tagIds = formData
    .getAll("tagIds")
    .map((value) => String(value))
    .filter(Boolean);

  if (!id || !title || !summary || !body) {
    redirectWithFeedback(redirectTo, {
      message: "Khong du thong tin de cap nhat article.",
      status: "error",
    });
  }

  const slug = slugify(title);

  if (!(await ensureUniqueSlug("article", slug, id))) {
    redirectWithFeedback(redirectTo, {
      message: "Article voi tieu de nay da ton tai.",
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
      summary,
      tags: {
        set: tagIds.map((tagId) => ({ id: tagId })),
      },
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
    message: `Da cap nhat article ${article.title}.`,
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
      message: "Khong du thong tin de restore article revision.",
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
    message: `Da restore article ${result.article.title} tu revision cu.`,
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
      message: "Hay chon it nhat mot article de thao tac.",
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
      message: "Khong tim thay article nao hop le de thao tac.",
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
      message: `Da xoa ${articles.length} article.`,
      status: "success",
    });
  }

  if (operation !== "publish" && operation !== "unpublish") {
    redirectWithFeedback(redirectTo, {
      message: "Bulk action article khong hop le.",
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
    message: `Da ${operation === "publish" ? "publish" : "unpublish"} ${articles.length} article.`,
    status: "success",
  });
}

export async function createFaq(formData: FormData) {
  const session = await requireRoles([Role.ADMIN, Role.EDITOR]);
  const redirectTo = getRedirectTo(formData, "/admin/faqs");
  const question = getString(formData, "question");
  const answer = getString(formData, "answer");
  const categoryId = getOptionalString(formData, "categoryId");
  const tagIds = formData
    .getAll("tagIds")
    .map((value) => String(value))
    .filter(Boolean);
  const status = getStatus(getString(formData, "status"));

  if (!question || !answer) {
    redirectWithFeedback(redirectTo, {
      message: "Question va answer deu la bat buoc.",
      status: "error",
    });
  }

  const slug = slugify(question);

  if (!(await ensureUniqueSlug("faq", slug))) {
    redirectWithFeedback(redirectTo, {
      message: "FAQ voi cau hoi nay da ton tai.",
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
      tags: {
        connect: tagIds.map((id) => ({ id })),
      },
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
    message: `Da tao FAQ ${question}.`,
    status: "success",
  });
}

export async function deleteFaq(formData: FormData) {
  await requireRoles([Role.ADMIN, Role.EDITOR]);
  const redirectTo = getRedirectTo(formData, "/admin/faqs");
  const id = getString(formData, "id");

  if (!id) {
    redirectWithFeedback(redirectTo, {
      message: "Khong tim thay FAQ can xoa.",
      status: "error",
    });
  }

  const faq = await db.faq.findUnique({
    where: { id },
    select: { question: true },
  });

  if (!faq) {
    redirectWithFeedback(redirectTo, {
      message: "FAQ khong ton tai.",
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
    message: `Da xoa FAQ ${faq.question}.`,
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
      message: "Khong tim thay FAQ can cap nhat trang thai.",
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
    message: `Da cap nhat trang thai FAQ ${faq.question} sang ${status}.`,
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
  const tagIds = formData
    .getAll("tagIds")
    .map((value) => String(value))
    .filter(Boolean);

  if (!id || !question || !answer) {
    redirectWithFeedback(redirectTo, {
      message: "Khong du thong tin de cap nhat FAQ.",
      status: "error",
    });
  }

  const slug = slugify(question);

  if (!(await ensureUniqueSlug("faq", slug, id))) {
    redirectWithFeedback(redirectTo, {
      message: "FAQ voi cau hoi nay da ton tai.",
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
      tags: {
        set: tagIds.map((tagId) => ({ id: tagId })),
      },
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
    message: `Da cap nhat FAQ ${faq.question}.`,
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
      message: "Khong du thong tin de restore FAQ revision.",
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
    message: `Da restore FAQ ${result.faq.question} tu revision cu.`,
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
      message: "Hay chon it nhat mot FAQ de thao tac.",
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
      message: "Khong tim thay FAQ nao hop le de thao tac.",
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
      message: `Da xoa ${faqs.length} FAQ.`,
      status: "success",
    });
  }

  if (operation !== "publish" && operation !== "unpublish") {
    redirectWithFeedback(redirectTo, {
      message: "Bulk action FAQ khong hop le.",
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
    message: `Da ${operation === "publish" ? "publish" : "unpublish"} ${faqs.length} FAQ.`,
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
      message: "Tat ca truong mat khau can it nhat 8 ky tu.",
      status: "error",
    });
  }

  if (nextPassword !== confirmPassword) {
    redirectWithFeedback(redirectTo, {
      message: "Xac nhan mat khau moi khong khop.",
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
      message: "Khong tim thay tai khoan hien tai.",
      status: "error",
    });
  }

  const isCurrentPasswordValid = await verifyPassword(
    user.passwordHash,
    currentPassword,
  );

  if (!isCurrentPasswordValid) {
    redirectWithFeedback(redirectTo, {
      message: "Mat khau hien tai khong dung.",
      status: "error",
    });
  }

  if (currentPassword === nextPassword) {
    redirectWithFeedback(redirectTo, {
      message: "Mat khau moi phai khac mat khau hien tai.",
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
    message: "Da cap nhat mat khau thanh cong.",
    status: "success",
  });
}
