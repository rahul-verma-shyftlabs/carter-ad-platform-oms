import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Formik, FormikHelpers } from 'formik';
import * as yup from 'yup';
import { Button, CarterInput, CarterSelect, Typography, carterColors } from 'shyftlabs-dsl';
import { Briefcase, DollarSign, Calendar, TrendingUp, Percent, Building2 } from 'lucide-react';
import useSWR from 'swr';
import { NextPageWithLayout } from '@/types/common';
import InternalLayout from '@/layouts/internal-layout/internal-layout';
import PageHeader from '@/components/page-header/page-header.component';
import SalesforceService from '@/services/crm/salesforce/salesforce.service';
import { showAlert } from '@/redux/actions';
import ROUTES from '@/common/routes';
import Field from '@/components/field/field.component';
import styles from '@/modules/crm/styles/crm.module.scss';

interface OpportunityFormValues {
  Name: string;
  AccountId: string;
  Amount: string;
  CloseDate: string;
  StageName: string;
  Probability: string;
}

const opportunitySchema = yup.object().shape({
  Name: yup.string().required('Opportunity Name is required'),
  CloseDate: yup.string().required('Close Date is required'),
  StageName: yup.string().required('Stage is required'),
  Amount: yup.string(),
  AccountId: yup.string(),
  Probability: yup.string(),
});

const EditOpportunityPage: NextPageWithLayout = () => {
  const router = useRouter();
  const { opportunityId } = router.query;
  const salesforceService = useMemo(() => new SalesforceService(), []);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: opportunity, isLoading } = useSWR(
    opportunityId ? `salesforce-opportunity-${opportunityId}` : null,
    async () => {
      try {
        return await salesforceService.getOpportunity(opportunityId as string, false);
      } catch (err: any) {
        if (err?.status === 401 || err?.status === 404) {
          showAlert({
            variant: 'warning',
            title: 'Connection Lost: Your Salesforce connection has expired. Please reconnect.',
          });
          router.push(ROUTES.CRM.SALESFORCE.CONNECT);
        }
        throw err;
      }
    }
  );

  const { data: stages, isLoading: isLoadingStages } = useSWR('opportunity-stages', async () => {
    try {
      return await salesforceService.getOpportunityStages();
    } catch {
      return [
        'Prospecting',
        'Qualification',
        'Needs Analysis',
        'Value Proposition',
        'Id. Decision Makers',
        'Perception Analysis',
        'Proposal/Price Quote',
        'Negotiation/Review',
        'Closed Won',
        'Closed Lost',
      ];
    }
  });

  const initialValues: OpportunityFormValues = useMemo(() => {
    if (!opportunity) {
      return {
        Name: '',
        AccountId: '',
        Amount: '',
        CloseDate: '',
        StageName: 'Prospecting',
        Probability: '',
      };
    }

    const formatDate = (dateStr: string) => {
      if (!dateStr) return '';
      try {
        const date = new Date(dateStr);
        return date.toISOString().split('T')[0];
      } catch {
        return '';
      }
    };

    return {
      Name: opportunity.Name || '',
      AccountId: opportunity.AccountId || '',
      Amount: opportunity.Amount ? String(opportunity.Amount) : '',
      CloseDate: formatDate(opportunity.CloseDate),
      StageName: opportunity.StageName || 'Prospecting',
      Probability: opportunity.Probability ? String(opportunity.Probability) : '',
    };
  }, [opportunity]);

  const handleSubmit = useCallback(
    async (values: OpportunityFormValues, { setSubmitting }: FormikHelpers<OpportunityFormValues>) => {
      setIsSubmitting(true);
      try {
        const opportunityData = {
          Name: values.Name,
          AccountId: values.AccountId || undefined,
          Amount: values.Amount ? parseFloat(values.Amount) : undefined,
          CloseDate: values.CloseDate,
          StageName: values.StageName,
          Probability: values.Probability ? parseFloat(values.Probability) : undefined,
        };

        await salesforceService.updateOpportunity(opportunityId as string, opportunityData);
        showAlert({
          variant: 'success',
          title: 'Opportunity updated successfully',
        });
        router.push(`/crm/opportunities/${opportunityId}`);
      } catch (err: any) {
        showAlert({
          variant: 'warning',
          title: err?.message || 'Failed to update Opportunity',
        });
      } finally {
        setIsSubmitting(false);
        setSubmitting(false);
      }
    },
    [salesforceService, router, opportunityId]
  );

  if (isLoading || isLoadingStages) {
    return (
      <>
        <PageHeader showBackButton title="Edit Opportunity" />
        <div className={styles.form_container}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: '48px',
            color: carterColors['text-600']
          }}>
            <Typography variant="body-regular">Loading...</Typography>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        showBackButton
        title={`Edit ${opportunity?.Name || 'Opportunity'}`}
      />
      <div className={styles.form_container}>
        <Formik
          initialValues={initialValues}
          validationSchema={opportunitySchema}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({ values, errors, touched, handleChange, handleBlur, handleSubmit, isValid, dirty, setFieldValue }) => {
            // Ensure Stage is set when opportunity and stages are loaded
            useEffect(() => {
              if (opportunity?.StageName && stages && stages.length > 0) {
                // Check if the current value doesn't match or is empty
                if (values.StageName !== opportunity.StageName) {
                  setFieldValue('StageName', opportunity.StageName);
                }
              }
            }, [opportunity?.StageName, stages, setFieldValue]);

            return (
              <form onSubmit={handleSubmit}>
                <div className={styles.form_card} style={{
                  padding: '32px',
                  borderRadius: '12px',
                  border: `1px solid ${carterColors['grey-200']}`,
                  backgroundColor: carterColors['white']
                }}>
                  {/* Section Header */}
                  <div style={{ 
                    marginBottom: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    paddingBottom: '20px',
                    borderBottom: `1px solid ${carterColors['grey-200']}`
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      backgroundColor: carterColors['brand-100'],
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Briefcase size={20} color={carterColors['brand-600']} />
                    </div>
                    <div>
                      <Typography variant="h1-semibold" color={carterColors['text-900']}>
                        Opportunity Details
                      </Typography>
                      <div style={{ marginTop: '4px' }}>
                        <Typography variant="caption-regular" color={carterColors['text-600']}>
                          Update the opportunity information below
                        </Typography>
                      </div>
                    </div>
                  </div>

                  <div className={styles.form_fields}>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <Field
                        label="Opportunity Name"
                        required
                        errorMessage={touched.Name && errors.Name}
                        fullWidth
                      >
                        <div style={{ position: 'relative' }}>
                          <div style={{
                            position: 'absolute',
                            left: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            zIndex: 1,
                            pointerEvents: 'none'
                          }}>
                            <Briefcase size={18} color={carterColors['text-400']} />
                          </div>
                          <CarterInput
                            id="Name"
                            value={values.Name}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            placeholder="Enter opportunity name"
                            style={{ paddingLeft: '40px' }}
                          />
                        </div>
                      </Field>
                    </div>

                    <Field
                      label="Amount"
                      errorMessage={touched.Amount && errors.Amount}
                      fullWidth
                    >
                      <div style={{ position: 'relative' }}>
                        <div style={{
                          position: 'absolute',
                          left: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          zIndex: 1,
                          pointerEvents: 'none'
                        }}>
                          <DollarSign size={18} color={carterColors['text-400']} />
                        </div>
                        <CarterInput
                          id="Amount"
                          type="number"
                          value={values.Amount}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          placeholder="0.00"
                          style={{ paddingLeft: '40px' }}
                        />
                      </div>
                    </Field>

                    <Field
                      label="Close Date"
                      required
                      errorMessage={touched.CloseDate && errors.CloseDate}
                      fullWidth
                    >
                      <div style={{ position: 'relative' }}>
                        <div style={{
                          position: 'absolute',
                          left: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          zIndex: 1,
                          pointerEvents: 'none'
                        }}>
                          <Calendar size={18} color={carterColors['text-400']} />
                        </div>
                        <CarterInput
                          id="CloseDate"
                          type="text"
                          value={values.CloseDate}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          style={{ paddingLeft: '40px' }}
                        />
                      </div>
                    </Field>

                    <Field
                      label="Stage"
                      required
                      errorMessage={touched.StageName && errors.StageName}
                      fullWidth
                    >
                      <div style={{ position: 'relative' }}>
                        <div style={{
                          position: 'absolute',
                          left: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          zIndex: 1,
                          pointerEvents: 'none'
                        }}>
                          <TrendingUp size={18} color={carterColors['text-400']} />
                        </div>
                        <div style={{ paddingLeft: '40px' }}>
                          <CarterSelect
                            id="StageName"
                            value={values.StageName || ''}
                            onChange={({ target }) => {
                              setFieldValue('StageName', target.value);
                            }}
                            onBlur={() => handleBlur('StageName')}
                            options={(stages || []).map((stage: string) => ({
                              label: stage,
                              value: stage,
                            }))}
                            width="100%"
                          />
                        </div>
                      </div>
                    </Field>

                    <Field
                      label="Probability (%)"
                      errorMessage={touched.Probability && errors.Probability}
                      fullWidth
                    >
                      <div style={{ position: 'relative' }}>
                        <div style={{
                          position: 'absolute',
                          left: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          zIndex: 1,
                          pointerEvents: 'none'
                        }}>
                          <Percent size={18} color={carterColors['text-400']} />
                        </div>
                        <CarterInput
                          id="Probability"
                          type="number"
                          min="0"
                          max="100"
                          value={values.Probability}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          placeholder="0"
                          style={{ paddingLeft: '40px' }}
                        />
                      </div>
                    </Field>

                    <Field 
                      label="Account ID" 
                      errorMessage={touched.AccountId && errors.AccountId} 
                      fullWidth
                    >
                      <div style={{ position: 'relative' }}>
                        <div style={{
                          position: 'absolute',
                          left: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          zIndex: 1,
                          pointerEvents: 'none'
                        }}>
                          <Building2 size={18} color={carterColors['text-400']} />
                        </div>
                        <CarterInput
                          id="AccountId"
                          value={values.AccountId}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          placeholder="Enter Account ID (optional)"
                          style={{ paddingLeft: '40px' }}
                        />
                      </div>
                    </Field>
                  </div>
                </div>

                <div className={styles.form_actions} style={{
                  padding: '24px 0',
                  marginTop: '24px',
                  borderTop: `1px solid ${carterColors['grey-200']}`,
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px'
                }}>
                  <Button
                    variant="secondary"
                    size="medium"
                    label="Cancel"
                    onClick={() => router.back()}
                    disabled={isSubmitting}
                  />
                  <Button
                    variant="primary"
                    size="medium"
                    label="Update Opportunity"
                    type="submit"
                    disabled={!isValid || !dirty || isSubmitting}
                    icon={<Briefcase size={16} />}
                    iconPosition="left"
                  />
                </div>
              </form>
            );
          }}
        </Formik>
      </div>
    </>
  );
};

EditOpportunityPage.getLayout = page => {
  return <InternalLayout head={{ title: 'Edit Opportunity' }}>{page}</InternalLayout>;
};

export default EditOpportunityPage;
