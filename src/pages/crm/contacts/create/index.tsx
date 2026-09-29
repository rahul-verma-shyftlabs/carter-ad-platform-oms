import React, { useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { Formik, FormikHelpers } from 'formik';
import * as yup from 'yup';
import { Button, CarterInput, Typography, carterColors } from 'shyftlabs-dsl';
import { User, Building2 } from 'lucide-react';
import { NextPageWithLayout } from '@/types/common';
import InternalLayout from '@/layouts/internal-layout/internal-layout';
import PageHeader from '@/components/page-header/page-header.component';
import SalesforceService from '@/services/crm/salesforce/salesforce.service';
import { showAlert } from '@/redux/actions';
import ROUTES from '@/common/routes';
import Field from '@/components/field/field.component';
import styles from '@/modules/crm/styles/crm.module.scss';

interface ContactFormValues {
  FirstName: string;
  LastName: string;
  Email: string;
  Phone: string;
  AccountId: string;
}

const contactSchema = yup.object().shape({
  LastName: yup.string().required('Last Name is required'),
  Email: yup.string().email('Invalid email address'),
  FirstName: yup.string(),
  Phone: yup.string(),
  AccountId: yup.string(),
});

const CreateContactPage: NextPageWithLayout = () => {
  const router = useRouter();
  const salesforceService = useMemo(() => new SalesforceService(), []);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialValues: ContactFormValues = {
    FirstName: '',
    LastName: '',
    Email: '',
    Phone: '',
    AccountId: '',
  };

  const handleSubmit = useCallback(
    async (values: ContactFormValues, { setSubmitting }: FormikHelpers<ContactFormValues>) => {
      setIsSubmitting(true);
      try {
        const contactData = {
          FirstName: values.FirstName || undefined,
          LastName: values.LastName,
          Email: values.Email || undefined,
          Phone: values.Phone || undefined,
          AccountId: values.AccountId || undefined,
        };

        const result = await salesforceService.createContact(contactData);
        showAlert({
          variant: 'success',
          title: 'Contact created successfully',
        });
        router.push(`/crm/contacts/${result.Id}`);
      } catch (err: any) {
        const errorMessage = err?.response?.data?.detail || err?.message || 'Failed to create Contact';
        
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
        title="Create Contact"
        breadcrumbs={[
          { label: 'Contacts', url: ROUTES.CRM.CONTACTS.BASE },
          { label: 'Create Contact' },
        ]}
      />
      <div className={styles.form_container}>
        <Formik initialValues={initialValues} validationSchema={contactSchema} onSubmit={handleSubmit}>
          {({ values, errors, touched, handleChange, handleBlur, handleSubmit, isValid, dirty }) => (
            <form onSubmit={handleSubmit} className={styles.create_form}>
              {/* Contact Information Section */}
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
                        Contact Information
                      </Typography>
                      <Typography variant="caption-regular" color={carterColors['text-600']}>
                        Basic contact details and personal information
                      </Typography>
                    </div>
                  </div>
                </div>
                <div className={styles.section_content}>
                  <div className={styles.form_fields}>
                    <Field label="First Name" errorMessage={touched.FirstName && errors.FirstName} fullWidth>
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
                        Link this contact to an account
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
                  label="Create Contact"
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

CreateContactPage.getLayout = page => {
  return <InternalLayout head={{ title: 'Create Contact' }}>{page}</InternalLayout>;
};

export default CreateContactPage;
