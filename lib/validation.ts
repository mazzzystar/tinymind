import { z } from 'zod';

// Safe path segment - prevents directory traversal attacks
const safePathSegment = z.string()
  .min(1, 'Path segment cannot be empty')
  .max(255, 'Path segment too long')
  .refine(
    (val) => !val.includes('..') && !val.includes('/') && !val.includes('\\'),
    'Invalid path: directory traversal not allowed'
  )
  .refine(
    (val) => !/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i.test(val),
    'Invalid path: reserved name not allowed'
  );

// Blog post validation
export const blogPostSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or less')
    .trim(),
  content: z.string()
    .min(1, 'Content is required')
    .max(100000, 'Content must be 100,000 characters or less'),
});

// Blog post ID validation (decodes and validates path safety)
export const blogIdSchema = z.string()
  .min(1, 'Blog ID is required')
  .max(500, 'Blog ID too long')
  .transform((val) => {
    try {
      const decoded = decodeURIComponent(val);
      return decoded;
    } catch {
      // Throw explicitly on invalid URL encoding to prevent bypass
      throw new Error('Invalid URL encoding in blog ID');
    }
  })
  .pipe(safePathSegment);

// Thought validation
export const thoughtSchema = z.object({
  content: z.string()
    .min(1, 'Content is required')
    .max(50000, 'Content must be 50,000 characters or less'),
  // Image URL: valid URL or empty/undefined (empty string transforms to undefined)
  image: z.union([
    z.string().url('Invalid image URL'),
    z.literal('').transform(() => undefined),
    z.undefined(),
  ]),
});

// Thought ID validation (timestamp-based)
export const thoughtIdSchema = z.string()
  .regex(/^\d+$/, 'Invalid thought ID format');

// Username validation (GitHub username rules)
export const usernameSchema = z.string()
  .min(1, 'Username is required')
  .max(39, 'Username too long')
  .regex(
    /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/,
    'Invalid GitHub username format'
  );

// About page validation
export const aboutPageSchema = z.object({
  content: z.string()
    .max(50000, 'Content must be 50,000 characters or less')
    .default(''),
});

// API action validation
export const apiActionSchema = z.enum([
  'createBlogPost',
  'updateBlogPost',
  'deleteBlogPost',
  'getBlogPost',
  'getBlogPosts',
  'createThought',
  'updateThought',
  'deleteThought',
  'getThoughts',
  'createAboutPage',
  'updateAboutPage',
  'getAboutPage',
  'uploadImage',
]);

export type ApiAction = z.infer<typeof apiActionSchema>;

/**
 * Validates and sanitizes a path segment to prevent directory traversal.
 * @param id - The raw ID from user input
 * @returns Sanitized path segment safe for file system operations
 * @throws Error if validation fails
 */
export function validatePath(id: string): string {
  const result = blogIdSchema.safeParse(id);
  if (!result.success) {
    throw new Error(`Invalid path: ${result.error.errors[0]?.message || 'validation failed'}`);
  }
  return result.data;
}

/**
 * Validates blog post data
 * @throws ZodError if validation fails
 */
export function validateBlogPost(data: unknown) {
  return blogPostSchema.parse(data);
}

/**
 * Validates thought data
 * @throws ZodError if validation fails
 */
export function validateThought(data: unknown) {
  return thoughtSchema.parse(data);
}

/**
 * Validates username
 * @throws ZodError if validation fails
 */
export function validateUsername(username: unknown) {
  return usernameSchema.parse(username);
}

/**
 * Safe validation that returns result instead of throwing
 */
export function safeValidatePath(id: string): { success: true; data: string } | { success: false; error: string } {
  const result = blogIdSchema.safeParse(id);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error.errors[0]?.message || 'validation failed' };
}
