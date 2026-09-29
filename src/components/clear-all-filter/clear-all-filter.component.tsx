import { Button } from 'shyftlabs-dsl';
import { XIcon } from '@/lib/icons';
import styles from './clear-all-filter.module.scss';

interface IClearAllFilter {
  isVisible?: boolean;
  onClick?: () => void;
  onClearAll?: () => void;
  className?: string;
}

const ClearAllFilter: React.FC<IClearAllFilter> = props => {
  const { isVisible = true } = props;
  if (!isVisible) {
    return null;
  }
  return (
    <Button
      className={styles.container}
      variant="secondary"
      icon={<XIcon />}
      size="small"
      onClick={props.onClick || props.onClearAll}
    />
  );
};

export default ClearAllFilter;
