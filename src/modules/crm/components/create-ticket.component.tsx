import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { useSelector } from 'react-redux';
import { Button, Typography, carterColors, CarterInput, CarterSelect, CarterTextArea } from 'shyftlabs-dsl';
import { ArrowLeft, Save } from 'lucide-react';
import { SectionType } from 'types';
import TicketService, { TicketCreate, TicketStatus } from '@/services/crm/tickets/ticket.service';
import UsersService from '@/services/users/users.service';
import SalesforceService from '@/services/crm/salesforce/salesforce.service';
import { showAlert } from '@/redux/actions';
import ROUTES from '@/common/routes';
import { IRootState } from '@/redux/reducers';
import DateInput from '@/components/date-input/date-input.component';
import styles from '../styles/crm.module.scss';

const CreateTicket: React.FC = () => {
  const router = useRouter();
  const isFromCarter = router.query.ref === 'carter';
  const backUrl = isFromCarter ? ROUTES.CRM.BASE : undefined;
  const CARTER_LOGO_URL = 'https://framerusercontent.com/images/1sWkb9vy1hgOa6EJ3Hv3HaZVLRU.png?width=2000&height=2000';
  const SALESFORCE_LOGO_URL = 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Salesforce.com_logo.svg/960px-Salesforce.com_logo.svg.png';
  const logoUrl = isFromCarter ? CARTER_LOGO_URL : SALESFORCE_LOGO_URL;
  const reduxUser = useSelector((state: IRootState) => state.common.user);
  const ticketService = useMemo(() => new TicketService(), []);
  const usersService = useMemo(() => new UsersService(), []);
  const salesforceService = useMemo(() => new SalesforceService(), []);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  const [formData, setFormData] = useState<TicketCreate>({
    title: '',
    description: '',
    status: TicketStatus.UNASSIGNED,
    assigned_user_account_id: undefined,
    created_by_user_account_id: reduxUser?.id || '',
    lead_data: null,
    source_type: 'lead',
    due_date: undefined,
  });
  const [users, setUsers] = useState<Array<{ id: string; name: string; accountId: string }>>([]);
  const [leads, setLeads] = useState<Array<{ id: string; name: string }>>([]);
  const [opportunities, setOpportunities] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string>('');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [hasDataFromSession, setHasDataFromSession] = useState(false);
  const [sourceType, setSourceType] = useState<'lead' | 'opportunity'>('lead');

  // Get lead or opportunity data from sessionStorage (passed via props/navigation from Salesforce data view)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check for source type first
      const storedSourceType = sessionStorage.getItem('ticket_source_type') as 'lead' | 'opportunity' | null;
      
      if (storedSourceType === 'opportunity') {
        const opportunityDataStr = sessionStorage.getItem('ticket_opportunity_data');
        if (opportunityDataStr) {
          try {
            const opportunity = JSON.parse(opportunityDataStr);
            setSourceType('opportunity');
            setFormData(prev => ({
              ...prev,
              title: `Ticket for ${opportunity.Name || opportunity.Id || 'Opportunity'}`,
              description: '', // Keep description blank
              lead_data: opportunity,
              source_type: 'opportunity',
            }));
            setSelectedOpportunityId(opportunity.Id || '');
            setHasDataFromSession(true);
            // Clear the sessionStorage after reading
            sessionStorage.removeItem('ticket_opportunity_data');
            sessionStorage.removeItem('ticket_source_type');
          } catch (error) {
            console.error('Error parsing opportunity data:', error);
            sessionStorage.removeItem('ticket_opportunity_data');
            sessionStorage.removeItem('ticket_source_type');
          }
        }
      } else {
        // Check for lead data
        const leadDataStr = sessionStorage.getItem('ticket_lead_data');
        if (leadDataStr) {
          try {
            const lead = JSON.parse(leadDataStr);
            setSourceType('lead');
            setFormData(prev => ({
              ...prev,
              title: `Ticket for ${lead.Name || lead.Id || 'Lead'}`,
              description: '', // Keep description blank
              lead_data: lead,
              source_type: 'lead',
            }));
            setSelectedLeadId(lead.Id || '');
            setHasDataFromSession(true);
            // Clear the sessionStorage after reading
            sessionStorage.removeItem('ticket_lead_data');
            sessionStorage.removeItem('ticket_source_type');
          } catch (error) {
            console.error('Error parsing lead data:', error);
            sessionStorage.removeItem('ticket_lead_data');
            sessionStorage.removeItem('ticket_source_type');
          }
        }
      }
    }
  }, []);

  // Fetch leads and opportunities from Salesforce (only if not coming from Salesforce data view)
  useEffect(() => {
    const fetchData = async () => {
      // Don't fetch if we already have data from sessionStorage
      if (hasDataFromSession) return;
      
      setIsLoadingLeads(true);
      try {
        // Fetch leads
        const leadsResponse = await salesforceService.getLeads(1000, false);
        const leadsList = leadsResponse.records || [];
        const mappedLeads = leadsList
          .filter((lead: any) => lead.Id && (lead.Name || lead.FirstName || lead.LastName || lead.Email))
          .map((lead: any) => ({
            id: lead.Id,
            name: lead.Name || `${lead.FirstName || ''} ${lead.LastName || ''}`.trim() || lead.Email || lead.Id,
          }));
        setLeads(mappedLeads);

        // Fetch opportunities
        const opportunitiesResponse = await salesforceService.getOpportunities(1000, false);
        const opportunitiesList = opportunitiesResponse.records || [];
        const mappedOpportunities = opportunitiesList
          .filter((opp: any) => opp.Id && opp.Name)
          .map((opp: any) => ({
            id: opp.Id,
            name: opp.Name || opp.Id,
          }));
        setOpportunities(mappedOpportunities);
      } catch (error: any) {
        console.error('Error fetching Salesforce data:', error);
        // Don't show error if it's just a connection issue
        if (error?.status !== 401 && error?.status !== 404) {
          showAlert({
            variant: 'warning',
            title: 'Could not load Salesforce data. You can still create a ticket without selecting a lead/opportunity.',
          });
        }
      } finally {
        setIsLoadingLeads(false);
      }
    };

    if (salesforceService && !hasDataFromSession) {
      fetchData();
    }
  }, [salesforceService, hasDataFromSession]);

  // Fetch users using UsersAdvanced GraphQL query
  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoadingUsers(true);
      try {
        // Fetch all users using UsersAdvanced query
        const response = await usersService.getAllUsers(
          {
            page: 1,
            pageSize: 10000, // Large page size to get all users
            filters: {
              currentUser: false,
              section: SectionType.User,
            },
            sort: '+name',
          },
          { silent: true }
        );
        
        // Extract users from UsersAdvanced query response
        const usersList = response.data?.usersAdvanced?.content || [];
        const totalCount = response.data?.usersAdvanced?.totalCount || 0;
        
        // If there are more users, fetch additional pages
        let allUsers = [...usersList];
        if (totalCount > 10000) {
          const totalPages = Math.ceil(totalCount / 10000);
          for (let page = 2; page <= totalPages; page++) {
            const nextResponse = await usersService.getAllUsers(
              {
                page,
                pageSize: 10000,
                filters: {
                  currentUser: false,
                  section: SectionType.User,
                },
                sort: '+name',
              },
              { silent: true }
            );
            allUsers = [...allUsers, ...(nextResponse.data?.usersAdvanced?.content || [])];
          }
        }
        
        // Map users with accountId from UsersAdvanced query response
        setUsers(
          allUsers
            .map((u: any) => ({
              id: u.id,
              name: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
              accountId: u.accountId || '', // Include all users, even if they don't have accountId
            }))
        );
      } catch (error) {
        console.error('Error fetching users from UsersAdvanced query:', error);
        showAlert({
          variant: 'error' as any,
          title: 'Failed to load users',
        });
      } finally {
        setIsLoadingUsers(false);
      }
    };

    if (usersService) {
      fetchUsers();
    }
  }, [usersService, showAlert]);

  // Set created_by_user_account_id when user is available from Redux
  useEffect(() => {
    if (reduxUser?.id) {
      setFormData(prev => ({
        ...prev,
        created_by_user_account_id: reduxUser.id,
      }));
    }
  }, [reduxUser]);

  const handleLeadChange = async (leadId: string) => {
    setSelectedLeadId(leadId);
    setSelectedOpportunityId(''); // Clear opportunity selection
    setSourceType('lead');
    if (!leadId) {
      setFormData(prev => ({ ...prev, lead_data: null, source_type: 'lead' }));
      return;
    }

    // Fetch full lead data by ID
    try {
      const lead = await salesforceService.getLead(leadId, false);
      if (lead) {
        setFormData(prev => ({
          ...prev,
          title: prev.title || `Ticket for ${lead.Name || lead.Id || 'Lead'}`,
          description: '', // Keep description blank
          lead_data: lead,
          source_type: 'lead',
        }));
      }
    } catch (error: any) {
      console.error('Error fetching lead details:', error);
        showAlert({
        variant: 'warning',
          title: 'Could not fetch lead details. Ticket will be created without lead information.',
        });
    }
  };

  const handleOpportunityChange = async (opportunityId: string) => {
    setSelectedOpportunityId(opportunityId);
    setSelectedLeadId(''); // Clear lead selection
    setSourceType('opportunity');
    if (!opportunityId) {
      setFormData(prev => ({ ...prev, lead_data: null, source_type: 'opportunity' }));
      return;
    }

    // Fetch full opportunity data by ID
    try {
      const opportunity = await salesforceService.getOpportunity(opportunityId, false);
      if (opportunity) {
        setFormData(prev => ({
          ...prev,
          title: prev.title || `Ticket for ${opportunity.Name || opportunity.Id || 'Opportunity'}`,
          description: '', // Keep description blank
          lead_data: opportunity,
          source_type: 'opportunity',
        }));
      }
    } catch (error: any) {
      console.error('Error fetching opportunity details:', error);
      showAlert({
        variant: 'warning',
        title: 'Could not fetch opportunity details. Ticket will be created without opportunity information.',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      showAlert({
        variant: 'warning',
        title: 'Validation Error: Please enter a title for the ticket',
      });
      return;
    }

    // Validate lead/opportunity selection (required when coming from Kanban)
    if (!hasDataFromSession && !selectedLeadId && !selectedOpportunityId) {
      showAlert({
        variant: 'warning',
        title: 'Validation Error: Please select a lead or opportunity for this ticket',
      });
      return;
    }

    setIsLoading(true);
    try {
      // If a user is assigned, automatically set status to OPEN
      // If no user is assigned, set status to UNASSIGNED
      const finalStatus: TicketStatus = formData.assigned_user_account_id 
        ? TicketStatus.OPEN  // User assigned → OPEN
        : TicketStatus.UNASSIGNED;  // No user assigned → UNASSIGNED

      // Ensure source_type is set correctly based on selection
      const finalSourceType = selectedOpportunityId ? 'opportunity' : (selectedLeadId ? 'lead' : formData.source_type || 'lead');
      
      await ticketService.createTicket({
        ...formData,
        status: finalStatus,
        source_type: finalSourceType, // Explicitly set source_type based on selection
        created_by_user_account_id: reduxUser?.id || '',
        due_date: dueDate ? dueDate.toISOString() : undefined,
      });
      
      showAlert({
        variant: 'success',
        title: 'Ticket created successfully',
      });
      
      router.push(ROUTES.CRM.TICKETS.KANBAN);
    } catch (error: any) {
      showAlert({
        variant: 'error' as any,
        title: error?.message || 'Failed to create ticket',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const leadData = formData.lead_data;

  return (
    <div className={styles.create_ticket_container}>
      <div className={styles.create_ticket_header}>
        <Button
          variant="tertiary"
          size="small"
          icon={<ArrowLeft size={16} />}
          iconPosition="left"
          label="Back"
          onClick={() => (backUrl ? router.push(backUrl) : router.back())}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Typography variant="h1-semibold" color={carterColors['text-900']}>
            Create Ticket
          </Typography>
          {logoUrl && (
            <Image
              src={logoUrl}
              alt={isFromCarter ? 'Carter' : 'Salesforce'}
              width={isFromCarter ? 20 : 50}
              height={isFromCarter ? 20 : 34}
              style={{ objectFit: 'contain' }}
            />
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className={styles.create_ticket_form}>
        {/* Lead/Opportunity Selection Section (only show when coming from Kanban, not from Salesforce data view) */}
        {!hasDataFromSession && (
          <div className={styles.form_section}>
            <div className={styles.section_header}>
              <Typography variant="body-large-semibold" color={carterColors['text-900']}>
                Source Selection
              </Typography>
              <Typography variant="caption-regular" color={carterColors['text-600']}>
                Select a lead or opportunity for this ticket
              </Typography>
            </div>
            <div className={styles.section_content}>
              <div className={styles.form_group}>
                <Typography variant="body-semibold" color={carterColors['text-900']}>
                  Lead <span className={styles.required}>*</span>
                </Typography>
                <CarterSelect
                  value={selectedLeadId}
                  onChange={(e) => handleLeadChange(e.target.value)}
                  placeholder="Select a lead"
                  width="100%"
                  options={leads.map((lead) => ({
                    label: lead.name,
                    value: lead.id,
                  }))}
                  disabled={isLoadingLeads}
                />
                {isLoadingLeads && (
                  <div style={{ marginTop: '4px' }}>
                    <Typography variant="caption-regular" color={carterColors['text-600']}>
                    Loading leads...
                  </Typography>
                  </div>
                )}
              </div>
              <div className={styles.form_group} style={{ marginTop: '16px' }}>
                <Typography variant="body-semibold" color={carterColors['text-900']}>
                  Opportunity <span className={styles.required}>*</span>
                </Typography>
                <CarterSelect
                  value={selectedOpportunityId}
                  onChange={(e) => handleOpportunityChange(e.target.value)}
                  placeholder="Select an opportunity"
                  width="100%"
                  options={opportunities.map((opp) => ({
                    label: opp.name,
                    value: opp.id,
                  }))}
                  disabled={isLoadingLeads}
                />
                {isLoadingLeads && (
                  <div style={{ marginTop: '4px' }}>
                    <Typography variant="caption-regular" color={carterColors['text-600']}>
                    Loading opportunities...
                  </Typography>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Lead/Opportunity Information Section (display when data is selected) */}
        {leadData && (
          <div className={styles.form_section}>
            <div className={styles.section_header}>
              <Typography variant="body-large-semibold" color={carterColors['text-900']}>
                {sourceType === 'opportunity' ? 'Opportunity Information' : sourceType === 'lead' ? 'Lead Information' : 'Contact Information'}
              </Typography>
              <Typography variant="caption-regular" color={carterColors['text-600']}>
                Basic information from the selected {sourceType === 'opportunity' ? 'opportunity' : sourceType === 'lead' ? 'lead' : 'contact'}
              </Typography>
            </div>
            <div className={styles.lead_info_grid}>
              {/* Show only Name and Id */}
              {leadData.Name && (
                <div className={styles.info_item}>
                  <Typography variant="caption-regular" color={carterColors['text-600']}>
                    Name
                  </Typography>
                  <Typography variant="body-regular" color={carterColors['text-900']}>
                    {leadData.Name}
                  </Typography>
                </div>
              )}
              {leadData.Id && (
                <div className={styles.info_item}>
                  <Typography variant="caption-regular" color={carterColors['text-600']}>
                    { isFromCarter ? 'Carter ID' : 'Salesforce ID' }
                  </Typography>
                  <div style={{ fontFamily: 'monospace' }}>
                    <Typography variant="body-regular" color={carterColors['text-900']}>
                      {leadData.Id}
                    </Typography>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Basic Information Section */}
        <div className={styles.form_section}>
          <div className={styles.section_header}>
            <Typography variant="body-large-semibold" color={carterColors['text-900']}>
              Basic Information
            </Typography>
            <Typography variant="caption-regular" color={carterColors['text-600']}>
              Provide details about the ticket
            </Typography>
          </div>
          <div className={styles.section_content}>
            <div className={styles.form_group}>
              <Typography variant="body-semibold" color={carterColors['text-900']}>
                Title <span className={styles.required}>*</span>
              </Typography>
              <CarterInput
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter ticket title"
                width="100%"
              />
            </div>

            <div className={styles.form_group}>
              <Typography variant="body-semibold" color={carterColors['text-900']}>
                Description
              </Typography>
              <CarterTextArea
                value={formData.description || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter ticket description"
                rows={6}
                resize="vertical"
              />
            </div>
          </div>
        </div>

        {/* Assignment Section */}
        <div className={styles.form_section}>
          <div className={styles.section_header}>
            <Typography variant="body-large-semibold" color={carterColors['text-900']}>
              Assignment
            </Typography>
            <Typography variant="caption-regular" color={carterColors['text-600']}>
              Assign this ticket to a team member
            </Typography>
          </div>
          <div className={styles.section_content}>
            <div className={styles.form_group}>
              <Typography variant="body-semibold" color={carterColors['text-900']}>
                Assign To
              </Typography>
              <CarterSelect
                value={formData.assigned_user_account_id || ''}
                onChange={(e) => {
                  const selectedValue = e.target.value;
                  setFormData(prev => ({ ...prev, assigned_user_account_id: selectedValue || undefined }));
                }}
                placeholder="Select a user to assign this ticket"
                width="100%"
                options={users.map((u) => ({
                  label: u.name,
                  value: String(u.id), // Use unique user ID as value, not accountId
                }))}
                disabled={isLoadingUsers}
              />
              {isLoadingUsers && (
                <div style={{ marginTop: '4px' }}>
                  <Typography variant="caption-regular" color={carterColors['text-600']}>
                  Loading users...
                </Typography>
                </div>
              )}
              {formData.assigned_user_account_id && (() => {
                const selectedUser = users.find(u => String(u.id) === String(formData.assigned_user_account_id));
                return selectedUser ? (
                  <div className={styles.selected_user_display}>
                    <Typography variant="body-regular" color={carterColors['text-700']}>
                      Selected: <strong>{selectedUser.name}</strong>
                    </Typography>
                  </div>
                ) : null;
              })()}
            </div>
          </div>
        </div>

        {/* Due Date Section */}
        <div className={styles.form_section}>
          <div className={styles.section_header}>
            <Typography variant="body-large-semibold" color={carterColors['text-900']}>
              Due Date
            </Typography>
            <Typography variant="caption-regular" color={carterColors['text-600']}>
              Set a due date for this ticket (optional)
            </Typography>
          </div>
          <div className={styles.section_content}>
            <div className={styles.form_group}>
              <Typography variant="body-semibold" color={carterColors['text-900']}>
                Due Date
              </Typography>
              <div className={styles.date_input_wrapper}>
                <DateInput
                  date={dueDate || undefined}
                  handleDateChange={(date) => setDueDate(date as Date | null)}
                  clearable
                />
              </div>
              {dueDate && (
                <div style={{ marginTop: '4px' }}>
                  <Typography variant="caption-regular" color={carterColors['text-600']}>
                  Due: {dueDate.toLocaleDateString()}
                </Typography>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className={styles.form_actions}>
          <Button
            variant="tertiary"
            size="medium"
            label="Cancel"
            onClick={() => (backUrl ? router.push(backUrl) : router.back())}
            disabled={isLoading}
          />
          <Button
            variant="primary"
            size="medium"
            label="Create Ticket"
            icon={<Save size={16} />}
            iconPosition="right"
            type="submit"
            loading={isLoading}
          />
        </div>
      </form>
    </div>
  );
};

export default CreateTicket;
