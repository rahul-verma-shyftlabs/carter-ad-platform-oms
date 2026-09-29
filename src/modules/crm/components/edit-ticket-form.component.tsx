import React, { useState, useMemo } from 'react';
import { Button, Typography, carterColors, CarterInput, CarterSelect, CarterTextArea } from 'shyftlabs-dsl';
import { ArrowLeft, Save } from 'lucide-react';
import TicketService, { Ticket, TicketUpdate, TicketStatus } from '@/services/crm/tickets/ticket.service';
import { showAlert } from '@/redux/actions';
import DateInput from '@/components/date-input/date-input.component';
import styles from '../styles/crm.module.scss';

interface EditTicketFormProps {
  ticket: Ticket;
  users: Array<{ id: string; name: string; accountId: string }>;
  onCancel: () => void;
  onSuccess: () => void;
}

const EditTicketForm: React.FC<EditTicketFormProps> = ({ ticket, users, onCancel, onSuccess }) => {
  const ticketService = useMemo(() => new TicketService(), []);
  
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<TicketUpdate>({
    title: ticket.title,
    description: ticket.description || '',
    status: ticket.status,
    assigned_user_account_id: ticket.assigned_user_account_id || undefined,
    due_date: ticket.due_date || undefined,
  });
  const [dueDate, setDueDate] = useState<Date | null>(
    ticket.due_date ? new Date(ticket.due_date) : null
  );

  const statusOptions = [
    { label: 'Unassigned', value: TicketStatus.UNASSIGNED },
    { label: 'Open', value: TicketStatus.OPEN },
    { label: 'Closed', value: TicketStatus.CLOSED },
    { label: 'Approved', value: TicketStatus.APPROVED },
    { label: 'Rejected', value: TicketStatus.REJECTED },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title?.trim()) {
      showAlert({
        variant: 'warning',
        title: 'Validation Error: Please enter a title for the ticket',
      });
      return;
    }

    setIsLoading(true);
    try {
      // If a user is assigned and status is UNASSIGNED, automatically set to OPEN
      let finalStatus: TicketStatus = formData.status || TicketStatus.UNASSIGNED;
      if (formData.assigned_user_account_id && formData.status === TicketStatus.UNASSIGNED) {
        finalStatus = TicketStatus.OPEN;
      }

      await ticketService.updateTicket(ticket.id, {
        ...formData,
        status: finalStatus,
        due_date: dueDate ? dueDate.toISOString() : undefined,
      });
      
      onSuccess();
    } catch (error: any) {
      showAlert({
        variant: 'error' as any,
        title: error?.message || 'Failed to update ticket',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.create_ticket_container}>
      <div className={styles.create_ticket_header}>
        <Button
          variant="tertiary"
          size="small"
          icon={<ArrowLeft size={16} />}
          onClick={onCancel}
        />
        <Typography variant="h1-semibold" color={carterColors['text-900']}>
          Edit Ticket
        </Typography>
      </div>

      <form onSubmit={handleSubmit} className={styles.create_ticket_form}>
        <div className={styles.card_layout}>
          <Typography variant="body-large-semibold" color={carterColors['text-900']}>
            Basic Information
          </Typography>
          <div className={styles.form_group}>
            <div style={{ marginBottom: '8px' }}>
              <Typography variant="body-semibold" color={carterColors['text-900']}>
              Title <span style={{ color: carterColors['red-700'] }}>*</span>
            </Typography>
            </div>
            <CarterInput
              value={formData.title || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter ticket title"
              width="100%"
            />
          </div>
          <div className={styles.form_group}>
            <div style={{ marginBottom: '8px' }}>
              <Typography variant="body-semibold" color={carterColors['text-900']}>
              Description
            </Typography>
            </div>
            <CarterTextArea
              value={formData.description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter ticket description"
              rows={6}
              resize="vertical"
            />
          </div>
          <div className={styles.form_group}>
            <div style={{ marginBottom: '8px' }}>
              <Typography variant="body-semibold" color={carterColors['text-900']}>
              Status
            </Typography>
            </div>
            <CarterSelect
              value={formData.status || TicketStatus.UNASSIGNED}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as TicketStatus }))}
              placeholder="Select status"
              width="100%"
              options={statusOptions}
            />
          </div>
        </div>

        <div className={styles.card_layout}>
          <Typography variant="body-large-semibold" color={carterColors['text-900']}>
            Assignment & Due Date
          </Typography>
          <div className={styles.form_group}>
            <div style={{ marginBottom: '8px' }}>
              <Typography variant="body-semibold" color={carterColors['text-900']}>
              Assign To
            </Typography>
            </div>
            <CarterSelect
              value={formData.assigned_user_account_id || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, assigned_user_account_id: e.target.value || undefined }))}
              placeholder="Select a user to assign this ticket"
              width="100%"
              options={[
                { label: 'Unassigned', value: '' },
                ...users.map((u) => ({
                  label: u.name,
                  value: String(u.id),
                })),
              ]}
            />
          </div>
          <div className={styles.form_group}>
            <div style={{ marginBottom: '8px' }}>
              <Typography variant="body-semibold" color={carterColors['text-900']}>
              Due Date (Optional)
            </Typography>
            </div>
            <div className={styles.date_input_wrapper}>
              <DateInput
                date={dueDate || undefined}
                handleDateChange={(date) => setDueDate(date as Date | null)}
                clearable
              />
            </div>
          </div>
        </div>

        <div className={styles.form_actions}>
          <Button
            variant="secondary"
            size="medium"
            label="Cancel"
            onClick={onCancel}
            disabled={isLoading}
          />
          <Button
            variant="primary"
            size="medium"
            type="submit"
            label="Update Ticket"
            icon={<Save size={16} />}
            disabled={isLoading}
            loading={isLoading}
          />
        </div>
      </form>
    </div>
  );
};

export default EditTicketForm;
