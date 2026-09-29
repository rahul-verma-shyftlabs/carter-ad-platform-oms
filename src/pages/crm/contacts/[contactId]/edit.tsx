import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Formik, FormikHelpers, FormikProps } from 'formik';
import * as yup from 'yup';
import { Button, CarterInput, Typography, carterColors } from 'shyftlabs-dsl';
import { User, Building2 } from 'lucide-react';
import useSWR from 'swr';
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
  MobilePhone: string;
  Title: string;
  Department: string;
  AccountId: string;
}

const contactSchema = yup.object().shape({
  LastName: yup.string().required('Last Name is required'),
  Email: yup.string().email('Invalid email address'),
  FirstName: yup.string(),
  Phone: yup.string(),
  MobilePhone: yup.string(),
  Title: yup.string(),
  Department: yup.string(),
  AccountId: yup.string(),
});

const EditContactPage: NextPageWithLayout = () => {
  const router = useRouter();
  const { contactId } = router.query;
  const salesforceService = useMemo(() => new SalesforceService(), []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formikRef = useRef<FormikProps<ContactFormValues>>(null);
  const [formState, setFormState] = useState<{ isValid: boolean; dirty: boolean }>({ isValid: false, dirty: false });

  const { data: contact, isLoading } = useSWR(
    contactId ? `salesforce-contact-${contactId}` : null,
    async () => {
      try {
        return await salesforceService.getContact(contactId as string, false);
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

  const initialValues: ContactFormValues = useMemo(() => {
    if (!contact) {
      return {
        FirstName: '',
        LastName: '',
        Email: '',
        Phone: '',
        MobilePhone: '',
        Title: '',
        Department: '',
        AccountId: '',
      };
    }
    return {
      FirstName: contact.FirstName || '',
      LastName: contact.LastName || '',
      Email: contact.Email || '',
      Phone: contact.Phone || '',
      MobilePhone: contact.MobilePhone || '',
      Title: contact.Title || '',
      Department: contact.Department || '',
      AccountId: contact.AccountId || '',
    };
  }, [contact]);

  const handleSubmit = useCallback(
    async (values: ContactFormValues, { setSubmitting }: FormikHelpers<ContactFormValues>) => {
      setIsSubmitting(true);
      try {
        const contactData = {
          FirstName: values.FirstName || undefined,
          LastName: values.LastName,
          Email: values.Email || undefined,
          Phone: values.Phone || undefined,
          MobilePhone: values.MobilePhone || undefined,
          Title: values.Title || undefined,
          Department: values.Department || undefined,
          AccountId: values.AccountId || undefined,
        };

        await salesforceService.updateContact(contactId as string, contactData);
        showAlert({
          variant: 'success',
          title: 'Contact updated successfully',
        });
        router.push(`/crm/contacts/${contactId}`);
      } catch (err: any) {
        showAlert({
          variant: 'warning',
          title: err?.message || 'Failed to update Contact',
        });
      } finally {
        setIsSubmitting(false);
        setSubmitting(false);
      }
    },
    [salesforceService, router, contactId]
  );

  const contactName = useMemo(() => {
    if (!contact) return 'Contact';
    const firstName = contact.FirstName || '';
    const lastName = contact.LastName || '';
    return `${firstName} ${lastName}`.trim() || 'Contact';
  }, [contact]);

  if (isLoading) {
    return (
      <>
        <PageHeader showBackButton title="Edit Contact" />
        <div className={styles.form_container}>Loading...</div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        showBackButton
        title={`Edit ${contactName}`}
        ActionComponent={() => (
          <Button
            type="button"
            variant="primary"
            size="small"
            label="Update Contact"
            onClick={() => {
              formikRef.current?.submitForm();
            }}
            disabled={!formState.isValid || !formState.dirty || isSubmitting}
          />
        )}
      />
      <div className={styles.form_container}>
        <Formik
          innerRef={formikRef}
          initialValues={initialValues}
          validationSchema={contactSchema}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({ values, errors, touched, handleChange, handleBlur, handleSubmit, isValid, dirty }) => {
            // Update form state for header button
            useEffect(() => {
              setFormState({ isValid, dirty });
            }, [isValid, dirty]);

            return (
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
                      <Field label="Mobile Phone" errorMessage={touched.MobilePhone && errors.MobilePhone} fullWidth>
                        <CarterInput
                          id="MobilePhone"
                          type="text"
                          value={values.MobilePhone}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          placeholder="Enter mobile phone number"
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
                      <Field label="Department" errorMessage={touched.Department && errors.Department} fullWidth>
                        <CarterInput
                          id="Department"
                          value={values.Department}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          placeholder="Enter department"
                        />
                      </Field>
                    </div>
                  </div>
                </div>

                {/* Account Information Section */}
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
                          Account Information
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
                    size="small"
                    label="Cancel"
                    onClick={() => router.back()}
                    disabled={isSubmitting}
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    size="small"
                    label="Update Contact"
                    disabled={!isValid || !dirty || isSubmitting}
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

EditContactPage.getLayout = page => {
  return <InternalLayout head={{ title: 'Edit Contact' }}>{page}</InternalLayout>;
};

export default EditContactPage;
