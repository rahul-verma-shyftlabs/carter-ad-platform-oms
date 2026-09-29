import React, { useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { Formik, FormikHelpers } from 'formik';
import * as yup from 'yup';
import { Button, CarterInput, CarterSelect, Typography, carterColors } from 'shyftlabs-dsl';
import { Briefcase, Building2 } from 'lucide-react';
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
  ContactId: string;
}

const opportunitySchema = yup.object().shape({
  Name: yup.string().required('Opportunity Name is required'),
  CloseDate: yup.string().required('Close Date is required'),
  StageName: yup.string().required('Stage is required'),
  Amount: yup.string(),
  AccountId: yup.string(),
  Probability: yup.string(),
  ContactId: yup.string(),
});

const CreateOpportunityPage: NextPageWithLayout = () => {
  const router = useRouter();
  const salesforceService = useMemo(() => new SalesforceService(), []);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: stages } = useSWR('opportunity-stages', async () => {
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

  const initialValues: OpportunityFormValues = {
    Name: '',
    AccountId: '',
    Amount: '',
    CloseDate: '',
    StageName: 'Prospecting',
    Probability: '',
    ContactId: '',
  };

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
          ContactId: values.ContactId || undefined,
        };

        const result = await salesforceService.createOpportunity(opportunityData);
        showAlert({
          variant: 'success',
          title: 'Opportunity created successfully',
        });
        router.push(`/crm/opportunities/${result.Id}`);
      } catch (err: any) {
        const errorMessage = err?.response?.data?.detail || err?.message || 'Failed to create Opportunity';
        
        if (errorMessage.includes('expired') || errorMessage.includes('401') || err?.response?.status === 401) {
          showAlert({
            variant: 'warning',
            title: 'Your Salesforce connection has expired. Please reconnect.',
          });
          router.push(ROUTES.CRM.SALESFORCE.CONNECT);
        } else {
          showAlert({
            variant: 'warning',
            title: errorMessage,
          });
        }
      } finally {
        setIsSubmitting(false);
        setSubmitting(false);
      }
    },
    [salesforceService, router]
  );

  return (
    <>
      <PageHeader
        showBackButton
        title="Create Opportunity"
      />
      <div className={styles.form_container}>
        <Formik initialValues={initialValues} validationSchema={opportunitySchema} onSubmit={handleSubmit}>
          {({ values, errors, touched, handleChange, handleBlur, handleSubmit, isValid, dirty }) => (
            <form onSubmit={handleSubmit} className={styles.create_form}>
              {/* Opportunity Details Section */}
              <div className={styles.form_section}>
                <div className={styles.section_header}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      backgroundColor: carterColors['brand-100'],
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Briefcase size={20} color={carterColors['brand-600']} />
                    </div>
                    <div>
                      <Typography variant="body-large-semibold" color={carterColors['text-900']}>
                        Opportunity Details
                      </Typography>
                      <Typography variant="caption-regular" color={carterColors['text-600']}>
                        Basic opportunity information and key metrics
                      </Typography>
                    </div>
                  </div>
                </div>
                <div className={styles.section_content}>
                  <div className={styles.form_fields}>
                    <Field
                      label="Opportunity Name"
                      required
                      errorMessage={touched.Name && errors.Name}
                      fullWidth
                    >
                      <CarterInput
                        id="Name"
                        value={values.Name}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Enter opportunity name"
                      />
                    </Field>
                    <Field
                      label="Amount"
                      errorMessage={touched.Amount && errors.Amount}
                      fullWidth
                    >
                      <CarterInput
                        id="Amount"
                        type="number"
                        value={values.Amount}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Enter amount"
                      />
                    </Field>
                    <Field
                      label="Close Date"
                      required
                      errorMessage={touched.CloseDate && errors.CloseDate}
                      fullWidth
                    >
                      <CarterInput
                        id="CloseDate"
                        type="text"
                        value={values.CloseDate}
                        onChange={handleChange}
                        onBlur={handleBlur}
                      />
                    </Field>
                    <Field
                      label="Stage"
                      required
                      errorMessage={touched.StageName && errors.StageName}
                      fullWidth
                    >
                      <CarterSelect
                        id="StageName"
                        value={values.StageName}
                        onChange={handleChange}
                        onBlur={() => handleBlur('StageName')}
                        options={(stages || []).map((stage: string) => ({
                          label: stage,
                          value: stage,
                        }))}
                      />
                    </Field>
                    <Field
                      label="Probability (%)"
                      errorMessage={touched.Probability && errors.Probability}
                      fullWidth
                    >
                      <CarterInput
                        id="Probability"
                        type="number"
                        min="0"
                        max="100"
                        value={values.Probability}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Enter probability"
                      />
                    </Field>
                  </div>
                </div>
              </div>

              {/* Related Information Section */}
              <div className={styles.form_section}>
                <div className={styles.section_header}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      backgroundColor: carterColors['grey-100'],
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Building2 size={20} color={carterColors['grey-700']} />
                    </div>
                    <div>
                      <Typography variant="body-large-semibold" color={carterColors['text-900']}>
                        Related Information
                      </Typography>
                      <Typography variant="caption-regular" color={carterColors['text-600']}>
                        Link this opportunity to an account or contact
                      </Typography>
                    </div>
                  </div>
                </div>
                <div className={styles.section_content}>
                  <div className={styles.form_fields}>
                    <Field label="Account ID" errorMessage={touched.AccountId && errors.AccountId} fullWidth>
                      <CarterInput
                        id="AccountId"
                        value={values.AccountId}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Enter Account ID (optional)"
                      />
                    </Field>
                    <Field label="Contact ID" errorMessage={touched.ContactId && errors.ContactId} fullWidth>
                      <CarterInput
                        id="ContactId"
                        value={values.ContactId}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Enter Contact ID (optional)"
                      />
                    </Field>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className={styles.form_actions}>
                <Button
                  variant="text-only"
                  size="medium"
                  label="Cancel"
                  onClick={() => router.back()}
                  disabled={isSubmitting}
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="medium"
                  label="Create Opportunity"
                  disabled={!isValid || !dirty || isSubmitting}
                />
              </div>
            </form>
          )}
        </Formik>
      </div>
    </>
  );
};

CreateOpportunityPage.getLayout = page => {
  return <InternalLayout head={{ title: 'Create Opportunity' }}>{page}</InternalLayout>;
};

export default CreateOpportunityPage;
