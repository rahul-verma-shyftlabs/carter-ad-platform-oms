import React, { useState, useMemo } from 'react';
import { Button, Typography, carterColors, CarterSelect, CarterInput, CarterCheckbox } from 'shyftlabs-dsl';
import { Formik, Form, Field as FormikField } from 'formik';
import * as Yup from 'yup';
import { X, UserPlus, Briefcase } from 'lucide-react';
import { Dialog } from '@/lib/material-ui';
import Field from '@/components/field/field.component';

interface LeadConversionModalProps {
  open: boolean;
  onClose: () => void;
  onConvert: (options: {
    convertToContact: boolean;
    convertToOpportunity: boolean;
    opportunityName?: string;
    opportunityAmount?: number;
    opportunityCloseDate?: string;
    opportunityStage?: string;
  }) => void;
  lead: any;
  isLoading?: boolean;
}

const LeadConversionModal: React.FC<LeadConversionModalProps> = ({
  open,
  onClose,
  onConvert,
  lead,
  isLoading = false,
}) => {
  const [convertToContact, setConvertToContact] = useState(true);
  const [convertToOpportunity, setConvertToOpportunity] = useState(false);

  const initialValues = useMemo(() => ({
    opportunityName: lead?.Company || '',
    opportunityAmount: '',
    opportunityCloseDate: new Date().toISOString().split('T')[0],
    opportunityStage: 'Prospecting',
  }), [lead]);

  const validationSchema = Yup.object().shape({
    opportunityName: Yup.string().when('convertToOpportunity', {
      is: true,
      then: (schema) => schema.required('Opportunity name is required'),
      otherwise: (schema) => schema,
    }),
    opportunityAmount: Yup.number().when('convertToOpportunity', {
      is: true,
      then: (schema) => schema.required('Amount is required').min(0, 'Amount must be positive'),
      otherwise: (schema) => schema,
    }),
    opportunityCloseDate: Yup.string().when('convertToOpportunity', {
      is: true,
      then: (schema) => schema.required('Close date is required'),
      otherwise: (schema) => schema,
    }),
  });

  const handleSubmit = (values: any) => {
    if (!convertToContact && !convertToOpportunity) {
      return;
    }

    onConvert({
      convertToContact,
      convertToOpportunity,
      opportunityName: convertToOpportunity ? values.opportunityName : undefined,
      opportunityAmount: convertToOpportunity ? parseFloat(values.opportunityAmount) : undefined,
      opportunityCloseDate: convertToOpportunity ? values.opportunityCloseDate : undefined,
      opportunityStage: convertToOpportunity ? values.opportunityStage : undefined,
    });
  };

  const leadName = useMemo(() => {
    if (!lead) return '';
    const firstName = lead.FirstName || '';
    const lastName = lead.LastName || '';
    return `${firstName} ${lastName}`.trim() || lead.Name || 'Lead';
  }, [lead]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <div style={{ padding: '32px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: carterColors['brand-100'],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <UserPlus size={20} color={carterColors['brand-600']} />
            </div>
            <Typography variant="h1-semibold" color={carterColors['text-900']}>
              Convert Lead
            </Typography>
          </div>
          <Button
            variant="tertiary"
            size="small"
            icon={<X size={16} />}
            onClick={onClose}
          />
        </div>

        {/* Lead Information Display */}
        {lead && (
          <div style={{ 
            padding: '20px', 
            backgroundColor: carterColors['grey-100'], 
            borderRadius: '12px',
            border: `1px solid ${carterColors['grey-200']}`,
            marginBottom: '32px'
          }}>
            <div style={{ marginBottom: '16px' }}>
              <Typography variant="body-large-semibold" color={carterColors['text-900']}>
                Lead Information
              </Typography>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <div style={{ marginBottom: '4px' }}>
                  <Typography variant="caption-regular" color={carterColors['text-600']}>
                    Company
                  </Typography>
                </div>
                <Typography variant="body-semibold" color={carterColors['text-900']}>
                  {lead.Company || '--'}
                </Typography>
              </div>
              <div>
                <div style={{ marginBottom: '4px' }}>
                  <Typography variant="caption-regular" color={carterColors['text-600']}>
                    Name
                  </Typography>
                </div>
                <Typography variant="body-semibold" color={carterColors['text-900']}>
                  {leadName}
                </Typography>
              </div>
              {lead.Email && (
                <div>
                  <div style={{ marginBottom: '4px' }}>
                    <Typography variant="caption-regular" color={carterColors['text-600']}>
                      Email
                    </Typography>
                  </div>
                  <Typography variant="body-regular" color={carterColors['text-900']}>
                    {lead.Email}
                  </Typography>
                </div>
              )}
              {lead.Phone && (
                <div>
                <div style={{ marginBottom: '4px' }}>
                  <Typography variant="caption-regular" color={carterColors['text-600']}>
                    Phone
                  </Typography>
                </div>
                  <Typography variant="body-regular" color={carterColors['text-900']}>
                    {lead.Phone}
                  </Typography>
                </div>
              )}
            </div>
          </div>
        )}

        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({ values, errors, touched, setFieldValue, handleChange }) => (
            <Form>
              {/* Conversion Options */}
              <div style={{ marginBottom: '32px' }}>
                <div style={{ marginBottom: '16px' }}>
                  <Typography variant="body-large-semibold" color={carterColors['text-900']}>
                    Conversion Options
                  </Typography>
                  <div style={{ marginTop: '4px' }}>
                    <Typography variant="caption-regular" color={carterColors['text-600']}>
                      Select what you want to create from this lead
                    </Typography>
                  </div>
                </div>
                
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '16px',
                  padding: '20px',
                  backgroundColor: carterColors['grey-100'],
                  borderRadius: '12px',
                  border: `1px solid ${carterColors['grey-200']}`
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <CarterCheckbox
                      checked={convertToContact}
                      onChange={(e) => setConvertToContact(e.target.checked)}
                      id="convert-to-contact"
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <UserPlus size={18} color={carterColors['brand-600']} />
                        <Typography variant="body-semibold" color={carterColors['text-900']}>
                          Convert to Contact
                        </Typography>
                      </div>
                      <Typography variant="caption-regular" color={carterColors['text-600']}>
                        Create a contact record from this lead's information
                      </Typography>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <CarterCheckbox
                      checked={convertToOpportunity}
                      onChange={(e) => setConvertToOpportunity(e.target.checked)}
                      id="convert-to-opportunity"
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <Briefcase size={18} color={carterColors['brand-600']} />
                        <Typography variant="body-semibold" color={carterColors['text-900']}>
                          Convert to Opportunity
                        </Typography>
                      </div>
                      <Typography variant="caption-regular" color={carterColors['text-600']}>
                        Create an opportunity record to track this potential sale
                      </Typography>
                    </div>
                  </div>
                </div>

                {!convertToContact && !convertToOpportunity && (
                  <div style={{
                    marginTop: '12px',
                    padding: '12px',
                    backgroundColor: carterColors['red-200'],
                    borderRadius: '8px',
                    border: `1px solid ${carterColors['red-200']}`
                  }}>
                    <Typography variant="caption-regular" color={carterColors['red-700']}>
                      Please select at least one conversion option
                    </Typography>
                  </div>
                )}
              </div>

              {/* Opportunity Form Fields */}
              {convertToOpportunity && (
                <div style={{ 
                  padding: '24px', 
                  backgroundColor: carterColors['grey-100'], 
                  borderRadius: '12px',
                  border: `1px solid ${carterColors['grey-200']}`,
                  marginBottom: '32px'
                }}>
                  <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Briefcase size={20} color={carterColors['brand-600']} />
                    <Typography variant="body-large-semibold" color={carterColors['text-900']}>
                      Opportunity Details
                    </Typography>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <Field 
                      label="Opportunity Name" 
                      required
                      errorMessage={touched.opportunityName && errors.opportunityName ? String(errors.opportunityName) : undefined}
                      fullWidth
                    >
                      <FormikField
                        as={CarterInput}
                        name="opportunityName"
                        placeholder="Enter opportunity name"
                        fullWidth
                        value={values.opportunityName}
                        onChange={handleChange}
                      />
                    </Field>

                    <Field 
                      label="Amount" 
                      required
                      errorMessage={touched.opportunityAmount && errors.opportunityAmount ? String(errors.opportunityAmount) : undefined}
                      fullWidth
                    >
                      <FormikField
                        as={CarterInput}
                        name="opportunityAmount"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        fullWidth
                        value={values.opportunityAmount}
                        onChange={handleChange}
                      />
                    </Field>

                    <Field 
                      label="Close Date" 
                      required
                      errorMessage={touched.opportunityCloseDate && errors.opportunityCloseDate ? String(errors.opportunityCloseDate) : undefined}
                      fullWidth
                    >
                      <FormikField
                        as={CarterInput}
                        name="opportunityCloseDate"
                        type="date"
                        fullWidth
                        value={values.opportunityCloseDate}
                        onChange={handleChange}
                      />
                    </Field>

                    <Field 
                      label="Stage" 
                      required
                      fullWidth
                    >
                      <CarterSelect
                        value={values.opportunityStage}
                        onChange={(e) => setFieldValue('opportunityStage', e.target.value)}
                        placeholder="Select stage"
                        width="100%"
                        options={[
                          { label: 'Prospecting', value: 'Prospecting' },
                          { label: 'Qualification', value: 'Qualification' },
                          { label: 'Needs Analysis', value: 'Needs Analysis' },
                          { label: 'Value Proposition', value: 'Value Proposition' },
                          { label: 'Id. Decision Makers', value: 'Id. Decision Makers' },
                          { label: 'Perception Analysis', value: 'Perception Analysis' },
                          { label: 'Proposal/Price Quote', value: 'Proposal/Price Quote' },
                          { label: 'Negotiation/Review', value: 'Negotiation/Review' },
                          { label: 'Closed Won', value: 'Closed Won' },
                          { label: 'Closed Lost', value: 'Closed Lost' },
                        ]}
                      />
                    </Field>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'flex-end', 
                gap: '12px', 
                marginTop: '32px',
                paddingTop: '24px',
                borderTop: `1px solid ${carterColors['grey-200']}`
              }}>
                <Button
                  variant="secondary"
                  size="medium"
                  label="Cancel"
                  onClick={onClose}
                  disabled={isLoading}
                />
                <Button
                  variant="primary"
                  size="medium"
                  label="Convert Lead"
                  type="submit"
                  disabled={isLoading || (!convertToContact && !convertToOpportunity)}
                  icon={<UserPlus size={16} />}
                  iconPosition="left"
                />
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </Dialog>
  );
};

export default LeadConversionModal;
