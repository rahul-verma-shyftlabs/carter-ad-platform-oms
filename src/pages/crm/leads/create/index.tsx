import React, { useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { Formik, FormikHelpers } from 'formik';
import * as yup from 'yup';
import { Button, CarterInput, CarterSelect, CarterTextArea, Typography, carterColors } from 'shyftlabs-dsl';
import { User, Building2, MapPin, FileText } from 'lucide-react';
import useSWR from 'swr';
import { NextPageWithLayout } from '@/types/common';
import InternalLayout from '@/layouts/internal-layout/internal-layout';
import PageHeader from '@/components/page-header/page-header.component';
import SalesforceService from '@/services/crm/salesforce/salesforce.service';
import { showAlert } from '@/redux/actions';
import ROUTES from '@/common/routes';
import Field from '@/components/field/field.component';
import styles from '@/modules/crm/styles/crm.module.scss';

interface LeadFormValues {
  FirstName: string;
  LastName: string;
  Email: string;
  Company: string;
  Phone: string;
  Status: string;
  Title: string;
  Industry: string;
  LeadSource: string;
  Rating: string;
  City: string;
  State: string;
  Country: string;
  PostalCode: string;
  Street: string;
  Website: string;
  Description: string;
}

const leadSchema = yup.object().shape({
  FirstName: yup.string().required('First Name is required'),
  LastName: yup.string().required('Last Name is required'),
  Company: yup.string().required('Company is required'),
  Email: yup.string().email('Invalid email address'),
  Phone: yup.string(),
  Status: yup.string(),
  Title: yup.string(),
  Industry: yup.string(),
  LeadSource: yup.string(),
  Rating: yup.string(),
  City: yup.string(),
  State: yup.string(),
  Country: yup.string(),
  PostalCode: yup.string(),
  Street: yup.string(),
  Website: yup.string().url('Invalid website URL'),
  Description: yup.string(),
});

const CreateLeadPage: NextPageWithLayout = () => {
  const router = useRouter();
  const salesforceService = useMemo(() => new SalesforceService(), []);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: statuses } = useSWR('lead-statuses', async () => {
    try {
      return await salesforceService.getLeadStatuses();
    } catch {
      return ['Open - Not Contacted', 'Working - Contacted', 'Closed - Converted', 'Closed - Not Converted'];
    }
  });

  const initialValues: LeadFormValues = {
    FirstName: '',
    LastName: '',
    Email: '',
    Company: '',
    Phone: '',
    Status: 'Open - Not Contacted',
    Title: '',
    Industry: '',
    LeadSource: '',
    Rating: '',
    City: '',
    State: '',
    Country: '',
    PostalCode: '',
    Street: '',
    Website: '',
    Description: '',
  };

  const handleSubmit = useCallback(
    async (values: LeadFormValues, { setSubmitting }: FormikHelpers<LeadFormValues>) => {
      setIsSubmitting(true);
      try {
        const leadData = {
          FirstName: values.FirstName || undefined,
          LastName: values.LastName,
          Email: values.Email || undefined,
          Company: values.Company,
          Phone: values.Phone || undefined,
          Status: values.Status || 'Open - Not Contacted',
          Title: values.Title || undefined,
          Industry: values.Industry || undefined,
          LeadSource: values.LeadSource || undefined,
          Rating: values.Rating || undefined,
          City: values.City || undefined,
          State: values.State || undefined,
          Country: values.Country || undefined,
          PostalCode: values.PostalCode || undefined,
          Street: values.Street || undefined,
          Website: values.Website || undefined,
          Description: values.Description || undefined,
        };

        const result = await salesforceService.createLead(leadData);
        showAlert({
          variant: 'success',
          title: 'Lead created successfully',
        });
        router.push(`/crm/leads/${result.Id}`);
      } catch (err: any) {
        const errorMessage = err?.response?.data?.detail || err?.message || 'Failed to create Lead';
        
        // Check if it's a token expiration error
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
        title="Create Lead"
      />
      <div className={styles.form_container}>
        <Formik initialValues={initialValues} validationSchema={leadSchema} onSubmit={handleSubmit}>
          {({ values, errors, touched, handleChange, handleBlur, handleSubmit, isValid, dirty, setFieldValue }) => (
            <form onSubmit={handleSubmit} className={styles.create_form}>
              {/* Lead Information Section */}
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
                      <User size={20} color={carterColors['brand-600']} />
                    </div>
                    <div>
                      <Typography variant="body-large-semibold" color={carterColors['text-900']}>
                        Lead Information
                      </Typography>
                      <Typography variant="caption-regular" color={carterColors['text-600']}>
                        Basic contact details and personal information
                      </Typography>
                    </div>
                  </div>
                </div>
                <div className={styles.section_content}>
                  <div className={styles.form_fields}>
                    <Field label="First Name" required errorMessage={touched.FirstName && errors.FirstName} fullWidth>
                      <CarterInput
                        id="FirstName"
                        value={values.FirstName}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Enter first name"
                      />
                    </Field>
                    <Field
                      label="Last Name"
                      required
                      errorMessage={touched.LastName && errors.LastName}
                      fullWidth
                    >
                      <CarterInput
                        id="LastName"
                        value={values.LastName}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Enter last name"
                      />
                    </Field>
                    <Field label="Email" errorMessage={touched.Email && errors.Email} fullWidth>
                      <CarterInput
                        id="Email"
                        type="email"
                        value={values.Email}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Enter email address"
                      />
                    </Field>
                    <Field label="Phone" errorMessage={touched.Phone && errors.Phone} fullWidth>
                      <CarterInput
                        id="Phone"
                        type="text"
                        value={values.Phone}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Enter phone number"
                      />
                    </Field>
                    <Field label="Title" errorMessage={touched.Title && errors.Title} fullWidth>
                      <CarterInput
                        id="Title"
                        value={values.Title}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Enter job title"
                      />
                    </Field>
                  </div>
                </div>
              </div>

              {/* Company Information Section */}
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
                        Company Information
                      </Typography>
                      <Typography variant="caption-regular" color={carterColors['text-600']}>
                        Company details and lead status
                      </Typography>
                    </div>
                  </div>
                </div>
                <div className={styles.section_content}>
                  <div className={styles.form_fields}>
                    <Field
                      label="Company"
                      required
                      errorMessage={touched.Company && errors.Company}
                      fullWidth
                    >
                      <CarterInput
                        id="Company"
                        value={values.Company}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Enter company name"
                      />
                    </Field>
                    <Field label="Status" errorMessage={touched.Status && errors.Status} fullWidth>
                      <CarterSelect
                        id="Status"
                        value={values.Status}
                        onChange={handleChange}
                        onBlur={() => handleBlur('Status')}
                        options={(statuses || []).map((status: string) => ({
                          label: status,
                          value: status,
                        }))}
                      />
                    </Field>
                    <Field label="Industry" errorMessage={touched.Industry && errors.Industry} fullWidth>
                      <CarterInput
                        id="Industry"
                        value={values.Industry}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Enter industry"
                      />
                    </Field>
                    <Field label="Lead Source" errorMessage={touched.LeadSource && errors.LeadSource} fullWidth>
                      <CarterInput
                        id="LeadSource"
                        value={values.LeadSource}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="e.g., Web, Phone, Referral"
                      />
                    </Field>
                    <Field label="Rating" errorMessage={touched.Rating && errors.Rating} fullWidth>
                      <CarterSelect
                        id="Rating"
                        value={values.Rating || ''}
                        onChange={({ target }) => {
                          setFieldValue('Rating', target.value);
                        }}
                        onBlur={() => handleBlur('Rating')}
                        placeholder="Select rating"
                        options={[
                          { label: 'Select rating', value: '' },
                          { label: 'Hot', value: 'Hot' },
                          { label: 'Warm', value: 'Warm' },
                          { label: 'Cold', value: 'Cold' },
                        ]}
                      />
                    </Field>
                    <Field label="Website" errorMessage={touched.Website && errors.Website} fullWidth>
                      <CarterInput
                        id="Website"
                        type="text"
                        value={values.Website}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="https://www.example.com"
                      />
                    </Field>
                  </div>
                </div>
              </div>

              {/* Address Information Section */}
              <div className={styles.form_section}>
                <div className={styles.section_header}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      backgroundColor: carterColors['green-200'],
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <MapPin size={20} color={carterColors['green-700']} />
                    </div>
                    <div>
                      <Typography variant="body-large-semibold" color={carterColors['text-900']}>
                        Address Information
                      </Typography>
                      <Typography variant="caption-regular" color={carterColors['text-600']}>
                        Location and address details
                      </Typography>
                    </div>
                  </div>
                </div>
                <div className={styles.section_content}>
                  <div className={styles.form_fields}>
                    <Field label="Street" errorMessage={touched.Street && errors.Street} fullWidth>
                      <CarterInput
                        id="Street"
                        value={values.Street}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Enter street address"
                      />
                    </Field>
                    <Field label="City" errorMessage={touched.City && errors.City} fullWidth>
                      <CarterInput
                        id="City"
                        value={values.City}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Enter city"
                      />
                    </Field>
                    <Field label="State" errorMessage={touched.State && errors.State} fullWidth>
                      <CarterInput
                        id="State"
                        value={values.State}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Enter state/province"
                      />
                    </Field>
                    <Field label="Postal Code" errorMessage={touched.PostalCode && errors.PostalCode} fullWidth>
                      <CarterInput
                        id="PostalCode"
                        value={values.PostalCode}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Enter postal/zip code"
                      />
                    </Field>
                    <Field label="Country" errorMessage={touched.Country && errors.Country} fullWidth>
                      <CarterInput
                        id="Country"
                        value={values.Country}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Enter country"
                      />
                    </Field>
                  </div>
                </div>
              </div>

              {/* Additional Information Section */}
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
                      <FileText size={20} color={carterColors['blue-700']} />
                    </div>
                    <div>
                      <Typography variant="body-large-semibold" color={carterColors['text-900']}>
                        Additional Information
                      </Typography>
                      <Typography variant="caption-regular" color={carterColors['text-600']}>
                        Additional notes and description
                      </Typography>
                    </div>
                  </div>
                </div>
                <div className={styles.section_content}>
                  <div className={styles.form_fields}>
                    <Field label="Description" errorMessage={touched.Description && errors.Description} fullWidth>
                      <CarterTextArea
                        id="Description"
                        rows={4}
                        value={values.Description}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Enter additional notes or description"
                        resize="vertical"
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
                  label="Create Lead"
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

CreateLeadPage.getLayout = page => {
  return <InternalLayout head={{ title: 'Create Lead' }}>{page}</InternalLayout>;
};

export default CreateLeadPage;
