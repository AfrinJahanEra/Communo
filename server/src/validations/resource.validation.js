import { z } from "zod";
import { objectId } from "./server.validation.js";

export const resourceIdParamSchema = z.object({
  serverId: objectId("server id"),
  resourceId: objectId("resource id"),
});

/** multipart fields arrive as strings; tags accepts JSON or comma-separated */
const tagsField = z
  .union([z.array(z.string()), z.string()])
  .optional()
  .transform((value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      /* fall through to comma-separated */
    }
    return value.split(",");
  })
  .pipe(
    z
      .array(z.string().trim().toLowerCase().min(1).max(30))
      .max(8, "A resource can have at most 8 tags")
  );

export const uploadResourceSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  description: z.string().trim().max(1000).optional().default(""),
  tags: tagsField,
});

export const updateResourceSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(1000).optional(),
    tags: tagsField.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const listResourcesQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  tag: z.string().trim().max(30).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});
