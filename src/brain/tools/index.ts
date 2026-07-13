/**
 * The tool set (plan.md §6.4): get_quote, get_availability, get_booking_link
 * (CH-05) + remember_fact (CH-09). get_booking, create_staff_task and
 * escalate_to_human arrive in their own chunks (CH-11/13/14).
 */
import { getAvailabilityTool } from './getAvailability.js';
import { getBookingLinkTool } from './getBookingLink.js';
import { getQuoteTool } from './getQuote.js';
import { rememberFactTool } from './rememberFact.js';
import { createToolRegistry, type ToolRegistry } from './registry.js';

export function buildToolRegistry(): ToolRegistry {
  return createToolRegistry([
    getQuoteTool,
    getAvailabilityTool,
    getBookingLinkTool,
    rememberFactTool,
  ]);
}

export type { ToolContext, ToolRegistry, ToolResult, ToolRun, ToolSpec } from './registry.js';
