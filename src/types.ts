import { Request } from "express";
import { 
  ComponentQuery, 
  ComponentParams, 
  ComponentSectionQuery,
  TokensQuery,
  SearchQuery
} from "./validation.js";

// Extended Request interfaces for specific endpoints
export interface ComponentListRequest extends Request {
  validatedQuery: ComponentQuery;
}

export interface ComponentDetailRequest extends Request {
  validatedParams: ComponentParams;
  validatedQuery: ComponentSectionQuery;
}

export interface TokensRequest extends Request {
  validatedQuery: TokensQuery;
}

export interface SearchRequest extends Request {
  validatedQuery: SearchQuery;
}
