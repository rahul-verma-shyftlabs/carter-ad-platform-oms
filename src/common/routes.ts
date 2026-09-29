const CRM_ROUTES = {
  BASE: '/crm/carter-crm',
  SALESFORCE: {
    BASE: '/crm/salesforce/data',
    CONNECT: '/crm/salesforce/connect',
    DATA: '/crm/salesforce/data',
  },
  MONDAY: {
    BASE: '/crm/monday',
    CONNECT: '/crm/monday/connect',
    DATA: '/crm/monday/data',
    BOARD: '/crm/monday/board/[boardId]',
  },
  CALLBACK: '/crm/callback',
  TICKETS: {
    BASE: '/crm/tickets',
    CREATE: '/crm/tickets/create',
    KANBAN: '/crm/tickets/kanban',
    TASKS: '/crm/tickets/tasks',
  },
  LEADS: {
    BASE: '/crm/leads',
    CREATE: '/crm/leads/create',
    DETAIL: '/crm/leads/[leadId]',
    EDIT: '/crm/leads/[leadId]/edit',
  },
  CONTACTS: {
    BASE: '/crm/contacts',
    CREATE: '/crm/contacts/create',
    DETAIL: '/crm/contacts/[contactId]',
    EDIT: '/crm/contacts/[contactId]/edit',
  },
  OPPORTUNITIES: {
    BASE: '/crm/opportunities',
    CREATE: '/crm/opportunities/create',
    DETAIL: '/crm/opportunities/[opportunityId]',
    EDIT: '/crm/opportunities/[opportunityId]/edit',
  },
  INTEGRATION: {
    BASE: '/crm/integration',
  },
};

const ROUTES = {
  CRM: CRM_ROUTES,
  DASHBOARD: '/crm/carter-crm',
};

export default ROUTES;
