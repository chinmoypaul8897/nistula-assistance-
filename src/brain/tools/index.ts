/**
 * The tool set (plan.md §6.4): get_quote, get_availability, get_booking_link
 * (CH-05) + remember_fact (CH-09) + get_booking (CH-11) + create_staff_task
 * (CH-13a) + escalate_to_human (CH-14a).
 */
import { createStaffTaskTool } from './createStaffTask.js';
import { escalateToHumanTool } from './escalateToHuman.js';
import { getAvailabilityTool } from './getAvailability.js';
import { getBookingTool } from './getBooking.js';
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
    getBookingTool,
    createStaffTaskTool,
    escalateToHumanTool,
  ]);
}

export type { ToolContext, ToolRegistry, ToolResult, ToolRun, ToolSpec } from './registry.js';
