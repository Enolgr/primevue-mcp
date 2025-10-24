import { z } from "zod";

// Inferred types from schemas
export type ComponentQuery = z.infer<typeof ComponentQuerySchema>;
export type ComponentParams = z.infer<typeof ComponentParamsSchema>;
export type ComponentSectionQuery = z.infer<typeof ComponentSectionQuerySchema>;
export type TokensQuery = z.infer<typeof TokensQuerySchema>;
export type SearchQuery = z.infer<typeof SearchQuerySchema>;
export type ComponentSummary = z.infer<typeof ComponentSummarySchema>;
export type Component = z.infer<typeof ComponentSchema>;
export type Token = z.infer<typeof TokenSchema>;
export type SearchResult = z.infer<typeof SearchResultSchema>;
export type SearchResponse = z.infer<typeof SearchResponseSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

// Schemas for query parameters
export const ComponentQuerySchema = z.object({
  q: z.string().optional().describe("Search term for filtering components")
});

export const ComponentParamsSchema = z.object({
  name: z.string().min(1).describe("Component name")
});

export const ComponentSectionQuerySchema = z.object({
  section: z.string().optional().describe("Specific section of the component to retrieve")
});

export const TokensQuerySchema = z.object({
  q: z.string().optional().describe("Search term for filtering tokens")
});

export const SearchQuerySchema = z.object({
  q: z.string().min(1).describe("Search term (required)")
});

// Response schemas
export const ComponentSummarySchema = z.object({
  name: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  hasProps: z.boolean(),
  hasExamples: z.boolean(),
  sections: z.array(z.string())
});

export const ComponentSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  props: z.record(z.any()).optional(),
  examples: z.array(z.any()).optional(),
  // Allow additional properties for flexibility
}).passthrough();

export const TokenSchema = z.object({
  count: z.number(),
  tokens: z.record(z.string())
});

export const SearchResultSchema = z.object({
  type: z.enum(["component", "token"]),
  name: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  value: z.string().optional(),
  matches: z.array(z.string())
});

export const SearchResponseSchema = z.object({
  query: z.string(),
  count: z.number(),
  results: z.array(SearchResultSchema)
});

export const ErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  available: z.array(z.string()).optional(),
  usage: z.object({
    method: z.string(),
    url: z.string(),
    required_parameter: z.string(),
    format: z.string()
  }).optional(),
  examples: z.array(z.string()).optional(),
  what_it_searches: z.object({
    components: z.array(z.string()),
    tokens: z.array(z.string())
  }).optional(),
  note: z.string().optional()
});

// Validation middleware helper
export function validateQuery<T>(schema: z.ZodSchema<T>) {
  return (req: any, res: any, next: any) => {
    try {
      const validatedQuery = schema.parse(req.query);
      req.validatedQuery = validatedQuery;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Invalid query parameters",
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      next(error);
    }
  };
}

export function validateParams<T>(schema: z.ZodSchema<T>) {
  return (req: any, res: any, next: any) => {
    try {
      const validatedParams = schema.parse(req.params);
      req.validatedParams = validatedParams;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Invalid path parameters",
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      next(error);
    }
  };
}
