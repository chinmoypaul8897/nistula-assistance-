/**
 * The CH-05 tool set (plan.md §6.4): get_quote, get_availability,
 * get_booking_link. get_booking, create_staff_task, escalate_to_human and
 * remember_fact arrive in their own chunks (CH-09/11/13/14).
 */
import { getAvailabilityTool } from './getAvailability.js';
import { getBookingLinkTool } from './getBookingLink.js';
import { getQuoteTool } from './getQuote.js';
import { createToolRegistry, type ToolRegistry } from './registry.js';

export function buildToolRegistry(): ToolRegistry {
  return createToolRegistry([getQuoteTool, getAvailabilityTool, getBookingLinkTool]);
}

export type { ToolContext, ToolRegistry, ToolResult, ToolRun, ToolSpec } from './registry.js';
