import { useRouter } from 'next/router';
import { Maybe } from 'types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { carterColors, Tooltip, Typography } from 'shyftlabs-dsl';
import Link from 'next/link';
import { Breadcrumbs, Skeleton } from '@/lib/material-ui';
import styles from './page-header.module.scss';

type PageHeaderVariant = 'default' | 'v2';

interface PageHeaderProps {
  title?: React.ReactNode;
  backUrl?: string;
  isLoading?: boolean;
  showBackButton?: boolean;
  breadcrumbs?: { url?: string; label: Maybe<string> }[];
  ActionComponent?: React.ComponentType;
  onPressBackButton?: () => void;
  variant?: PageHeaderVariant;
  testId?: string;
  sticky?: boolean;
}

const PageHeaderLink = ({ label, url }: { label: string; url?: string }) => {
  return (
    <Tooltip title={label.length > 30 ? label : undefined}>
      {url ? (
        <Link href={url}>
          <Typography color={carterColors['links-blue']} variant="caption-medium" trimLength={30}>
            {label}
          </Typography>
        </Link>
      ) : (
        <Typography color={carterColors['text-800']} variant="caption-regular" trimLength={30}>
          {label}
        </Typography>
      )}
    </Tooltip>
  );
};

const PageHeader: React.FC<PageHeaderProps> = props => {
  const {
    isLoading,
    variant = 'default',
    title,
    onPressBackButton,
    backUrl,
    showBackButton,
    breadcrumbs,
    ActionComponent,
    testId,
    sticky,
  } = props;

  const router = useRouter();

  const handleBackIconClick = () => {
    if (onPressBackButton) {
      onPressBackButton();
    } else {
      if (backUrl) {
        router.replace(backUrl);
        return;
      }
      router.back();
    }
  };

  if (variant === 'v2') {
    return (
      <div className={styles.container_v2} data-sticky={sticky}>
        <button className={styles.back_button} type="button" data-testid="back-button" onClick={handleBackIconClick}>
          <ChevronLeft color={carterColors['brand-600']} height={24} />
          <Typography variant="body-medium" color={carterColors['brand-600']}>
            Back
          </Typography>
        </button>
        <Typography variant="body-large-semibold" color={carterColors['text-900']} data-testid={testId}>
          {title}
        </Typography>
        {ActionComponent && <ActionComponent />}
      </div>
    );
  }

  return (
    <div className={styles.container} data-sticky>
      <div className={styles.header_container}>
        {showBackButton && (
          <button className={styles.back_button} type="button" data-testid="back-button" onClick={handleBackIconClick}>
            <ChevronLeft color={carterColors['brand-600']} height={24} />
          </button>
        )}
        <div>
          {isLoading ? (
            <Skeleton width={150} />
          ) : (
            <Typography variant="body-large-semibold" color={carterColors['text-900']} data-testid={testId}>
              {title}
            </Typography>
          )}

          {!!breadcrumbs?.length && (
            <Breadcrumbs
              aria-label="breadcrumb"
              separator={<ChevronRight height={16} width={16} color={carterColors['text-500']} />}
              className={`${styles.breadcrumbs_container}`}
            >
              {breadcrumbs.map(item =>
                isLoading ? <Skeleton width={50} /> : <PageHeaderLink label={item.label as string} url={item.url} />,
              )}
            </Breadcrumbs>
          )}
        </div>
      </div>
      {ActionComponent && <ActionComponent />}
    </div>
  );
};

export default PageHeader;