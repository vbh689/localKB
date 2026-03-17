"use server";

import { ContentStatus, RevisionEntityType, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRoles } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
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

export async function createUser(formData: FormData) {
  await requireRoles([Role.ADMIN]);
  const email = getString(formData, "email").toLowerCase();
  const password = getString(formData, "password");
  const role = getRole(getString(formData, "role"));

  if (!email || password.length < 8) {
    return;
  }

  await db.user.create({
    data: {
      email,
      passwordHash: await hashPassword(password),
      role,
    },
  });

  revalidatePath("/admin/users");
}

export async function updateUser(formData: FormData) {
  const session = await requireRoles([Role.ADMIN]);
  const id = getString(formData, "id");
  const email = getString(formData, "email").toLowerCase();
  const password = getString(formData, "password");
  const role = getRole(getString(formData, "role"));

  if (!id || !email) {
    return;
  }

  if (session.user.id === id && role !== Role.ADMIN) {
    return;
  }

  const currentUser = await db.user.findUnique({
    where: {
      id,
    },
  });

  if (!currentUser) {
    return;
  }

  if (currentUser.role === Role.ADMIN && role !== Role.ADMIN) {
    const hasAnotherAdmin = await ensureAnotherAdminExists(id);

    if (!hasAnotherAdmin) {
      return;
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
}

export async function deleteUser(formData: FormData) {
  const session = await requireRoles([Role.ADMIN]);
  const id = getString(formData, "id");

  if (!id || id === session.user.id) {
    return;
  }

  const currentUser = await db.user.findUnique({
    where: {
      id,
    },
  });

  if (!currentUser) {
    return;
  }

  if (currentUser.role === Role.ADMIN) {
    const hasAnotherAdmin = await ensureAnotherAdminExists(id);

    if (!hasAnotherAdmin) {
      return;
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
}

export async function createCategory(formData: FormData) {
  await requireRoles([Role.ADMIN, Role.EDITOR]);
  const name = getString(formData, "name");

  if (!name) {
    return;
  }

  await db.category.create({
    data: {
      name,
      slug: slugify(name),
    },
  });

  revalidatePath("/admin/categories");
  revalidatePath("/admin/articles");
  revalidatePath("/admin/faqs");
}

export async function updateCategory(formData: FormData) {
  await requireRoles([Role.ADMIN, Role.EDITOR]);
  const id = getString(formData, "id");
  const name = getString(formData, "name");

  if (!id || !name) {
    return;
  }

  await db.category.update({
    where: {
      id,
    },
    data: {
      name,
      slug: slugify(name),
    },
  });

  revalidatePath("/admin/categories");
  revalidatePath("/admin/articles");
  revalidatePath("/admin/faqs");
  revalidatePath("/");
}

export async function deleteCategory(formData: FormData) {
  await requireRoles([Role.ADMIN, Role.EDITOR]);
  const id = getString(formData, "id");

  if (!id) {
    return;
  }

  await db.category.delete({
    where: {
      id,
    },
  });

  revalidatePath("/admin/categories");
  revalidatePath("/admin/articles");
  revalidatePath("/admin/faqs");
}

export async function createTag(formData: FormData) {
  await requireRoles([Role.ADMIN, Role.EDITOR]);
  const name = getString(formData, "name");

  if (!name) {
    return;
  }

  await db.tag.create({
    data: {
      name,
      slug: slugify(name),
    },
  });

  revalidatePath("/admin/tags");
  revalidatePath("/admin/articles");
  revalidatePath("/admin/faqs");
}

export async function updateTag(formData: FormData) {
  await requireRoles([Role.ADMIN, Role.EDITOR]);
  const id = getString(formData, "id");
  const name = getString(formData, "name");

  if (!id || !name) {
    return;
  }

  await db.tag.update({
    where: {
      id,
    },
    data: {
      name,
      slug: slugify(name),
    },
  });

  revalidatePath("/admin/tags");
  revalidatePath("/admin/articles");
  revalidatePath("/admin/faqs");
  revalidatePath("/");
}

export async function deleteTag(formData: FormData) {
  await requireRoles([Role.ADMIN, Role.EDITOR]);
  const id = getString(formData, "id");

  if (!id) {
    return;
  }

  await db.tag.delete({
    where: {
      id,
    },
  });

  revalidatePath("/admin/tags");
  revalidatePath("/admin/articles");
  revalidatePath("/admin/faqs");
}

export async function createArticle(formData: FormData) {
  const session = await requireRoles([Role.ADMIN, Role.EDITOR]);
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
    return;
  }

  const article = await db.article.create({
    data: {
      authorId: session.user.id,
      body,
      categoryId,
      publishedAt: getPublishedAt(status),
      slug: slugify(title),
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
}

export async function deleteArticle(formData: FormData) {
  await requireRoles([Role.ADMIN, Role.EDITOR]);
  const id = getString(formData, "id");

  if (!id) {
    return;
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
}

export async function updateArticleStatus(formData: FormData) {
  const session = await requireRoles([Role.ADMIN, Role.EDITOR]);
  const id = getString(formData, "id");
  const status = getStatus(getString(formData, "status"));

  if (!id) {
    return;
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
}

export async function updateArticle(formData: FormData) {
  const session = await requireRoles([Role.ADMIN, Role.EDITOR]);
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
    return;
  }

  const article = await db.article.update({
    where: {
      id,
    },
    data: {
      body,
      categoryId,
      publishedAt: getPublishedAt(status),
      slug: slugify(title),
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
}

export async function createFaq(formData: FormData) {
  const session = await requireRoles([Role.ADMIN, Role.EDITOR]);
  const question = getString(formData, "question");
  const answer = getString(formData, "answer");
  const categoryId = getOptionalString(formData, "categoryId");
  const tagIds = formData
    .getAll("tagIds")
    .map((value) => String(value))
    .filter(Boolean);
  const status = getStatus(getString(formData, "status"));

  if (!question || !answer) {
    return;
  }

  const faq = await db.faq.create({
    data: {
      answer,
      categoryId,
      publishedAt: getPublishedAt(status),
      question,
      slug: slugify(question),
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
}

export async function deleteFaq(formData: FormData) {
  await requireRoles([Role.ADMIN, Role.EDITOR]);
  const id = getString(formData, "id");

  if (!id) {
    return;
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
}

export async function updateFaqStatus(formData: FormData) {
  const session = await requireRoles([Role.ADMIN, Role.EDITOR]);
  const id = getString(formData, "id");
  const status = getStatus(getString(formData, "status"));

  if (!id) {
    return;
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
}

export async function updateFaq(formData: FormData) {
  const session = await requireRoles([Role.ADMIN, Role.EDITOR]);
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
    return;
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
      slug: slugify(question),
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
}
