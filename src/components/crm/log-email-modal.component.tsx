import React from 'react';
import { Button, Typography, carterColors, CarterTextArea, CarterInput, CarterSelect } from 'shyftlabs-dsl';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { X, Mail } from 'lucide-react';
import { Dialog } from '@/lib/material-ui';
import useAccount from '@/contexts/account/account-data.hook';
import DateTimeParser from '@/lib/date-time-parser';

interface LogEmailModalProps {
  open: boolean;
  onClose: () => void;
  onLogEmail: (emailData: {
    subject: string;
    what_id?: string;
    who_id?: string;
    status?: string;
    priority?: string;
    description?: string;
    email_date?: string;
    to_address?: string;
    from_address?: string;
  }) => Promise<void>;
  lead?: any;
  contact?: any;
  opportunity?: any;
  isLoading?: boolean;
}

const LogEmailModal: React.FC<LogEmailModalProps> = ({
  open,
  onClose,
  onLogEmail,
  lead,
  contact,
  opportunity,
  isLoading = false,
}) => {
  useAccount();
  
  // Get the record (lead, contact, or opportunity)
  const record = lead || contact || opportunity;
  const recordName = lead 
    ? `${lead?.FirstName || ''} ${lead?.LastName || ''}`.trim() || lead?.Name || 'Lead'
    : contact
    ? `${contact?.FirstName || ''} ${contact?.LastName || ''}`.trim() || contact?.Name || 'Contact'
    : opportunity?.Name || 'Opportunity';
  
  const recordEmail = lead?.Email || contact?.Email || '';
  
  // Default to now in EST timezone
  const getDefaultEmailTime = () => {
    const estTimeZone = 'America/New_York';
    const now = DateTimeParser.tz(estTimeZone);
    // Format: YYYY-MM-DDTHH:mm (datetime-local format)
    const year = now.year();
    const month = String(now.month() + 1).padStart(2, '0');
    const day = String(now.date()).padStart(2, '0');
    const hours = String(now.hour()).padStart(2, '0');
    const minutes = String(now.minute()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const initialValues = {
    subject: `Email to ${recordName}`.trim() || 'Email',
    email_date: getDefaultEmailTime(),
    status: 'Completed',
    priority: 'Normal',
    to_address: recordEmail || '',
    from_address: '',
    description: '',
  };

  const validationSchema = Yup.object().shape({
    subject: Yup.string().required('Subject is required'),
    email_date: Yup.string().required('Email date and time is required'),
    status: Yup.string().required('Status is required'),
    priority: Yup.string().required('Priority is required'),
    to_address: Yup.string().email('Invalid email address').nullable(),
    from_address: Yup.string().email('Invalid email address').nullable(),
    description: Yup.string().nullable(),
  });

  const handleSubmit = async (values: any) => {
    // Convert datetime-local value to EST timezone and then to ISO format
    const estTimeZone = 'America/New_York';
    const emailDate = DateTimeParser.tz(values.email_date, estTimeZone);
    
    await onLogEmail({
      subject: values.subject,
      what_id: lead?.Id || contact?.Id || opportunity?.Id,
      who_id: lead?.Id || contact?.Id,
      status: values.status,
      priority: values.priority,
      description: values.description || undefined,
      email_date: emailDate.toISOString(),
      to_address: values.to_address || undefined,
      from_address: values.from_address || undefined,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <div style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Mail size={24} color={carterColors['brand-600']} />
            <Typography variant="h1-semibold" color={carterColors['text-900']}>
              Send Email
            </Typography>
          </div>
          <Button
            variant="tertiary"
            size="small"
            icon={<X size={16} />}
            onClick={onClose}
          />
        </div>

        {/* Record Information Display */}
        {record && (
          <div style={{ 
            padding: '12px 16px', 
            backgroundColor: carterColors['grey-100'], 
            borderRadius: '8px',
            marginBottom: '24px'
          }}>
            <Typography variant="body-regular" color={carterColors['text-700']}>
              <strong>To:</strong> {recordName} {recordEmail && `(${recordEmail})`}
            </Typography>
          </div>
        )}

        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({ values, errors, touched, setFieldValue }) => (
            <Form>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px' }}>
                    <Typography variant="body-semibold" color={carterColors['text-900']}>
                      Subject <span style={{ color: carterColors['red-500'] }}>*</span>
                    </Typography>
                  </label>
                  <Field
                    as={CarterInput}
                    name="subject"
                    placeholder="Email subject"
                    fullWidth
                    error={touched.subject && errors.subject ? String(errors.subject) : undefined}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px' }}>
                    <Typography variant="body-semibold" color={carterColors['text-900']}>
                      Email Date & Time (EST) <span style={{ color: carterColors['red-500'] }}>*</span>
                    </Typography>
                  </label>
                  <Field
                    as={CarterInput}
                    name="email_date"
                    type="datetime-local"
                    fullWidth
                    error={touched.email_date && errors.email_date ? String(errors.email_date) : undefined}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '8px' }}>
                      <Typography variant="body-semibold" color={carterColors['text-900']}>
                        To Address
                      </Typography>
                    </label>
                    <Field
                      as={CarterInput}
                      name="to_address"
                      type="email"
                      placeholder="recipient@example.com"
                      fullWidth
                      error={touched.to_address && errors.to_address ? String(errors.to_address) : undefined}
                    />
                  </div>

                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '8px' }}>
                      <Typography variant="body-semibold" color={carterColors['text-900']}>
                        From Address
                      </Typography>
                    </label>
                    <Field
                      as={CarterInput}
                      name="from_address"
                      type="email"
                      placeholder="sender@example.com"
                      fullWidth
                      error={touched.from_address && errors.from_address ? String(errors.from_address) : undefined}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '8px' }}>
                      <Typography variant="body-semibold" color={carterColors['text-900']}>
                        Status <span style={{ color: carterColors['red-500'] }}>*</span>
                      </Typography>
                    </label>
                    <CarterSelect
                      id="status"
                      value={values.status || ''}
                      onChange={({ target }) => {
                        setFieldValue('status', target.value);
                      }}
                      options={[
                        { label: 'Completed', value: 'Completed' },
                        { label: 'Not Started', value: 'Not Started' },
                        { label: 'In Progress', value: 'In Progress' },
                        { label: 'Waiting on someone else', value: 'Waiting on someone else' },
                        { label: 'Deferred', value: 'Deferred' },
                      ]}
                    />
                    {touched.status && errors.status && (
                      <div style={{ marginTop: '4px' }}>
                        <Typography variant="caption-regular" color={carterColors['red-500']}>
                        {String(errors.status)}
                        </Typography>
                      </div>
                    )}
                  </div>

                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '8px' }}>
                      <Typography variant="body-semibold" color={carterColors['text-900']}>
                        Priority <span style={{ color: carterColors['red-500'] }}>*</span>
                      </Typography>
                    </label>
                    <CarterSelect
                      id="priority"
                      value={values.priority || ''}
                      onChange={({ target }) => {
                        setFieldValue('priority', target.value);
                      }}
                      options={[
                        { label: 'High', value: 'High' },
                        { label: 'Normal', value: 'Normal' },
                        { label: 'Low', value: 'Low' },
                      ]}
                    />
                    {touched.priority && errors.priority && (
                      <div style={{ marginTop: '4px' }}>
                        <Typography variant="caption-regular" color={carterColors['red-500']}>
                          {String(errors.priority)}
                        </Typography>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px' }}>
                    <Typography variant="body-semibold" color={carterColors['text-900']}>
                      Email Body / Notes
                    </Typography>
                  </label>
                  <Field
                    as={CarterTextArea}
                    name="description"
                    placeholder="Enter email content, discussion points, or notes"
                    rows={8}
                    fullWidth
                    error={touched.description && errors.description ? String(errors.description) : undefined}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                  <Button
                    variant="secondary"
                    size="medium"
                    label="Cancel"
                    onClick={onClose}
                    disabled={isLoading}
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    size="medium"
                    label="Send Email"
                    icon={<Mail size={16} />}
                    disabled={isLoading}
                  />
                </div>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </Dialog>
  );
};

export default LogEmailModal;
