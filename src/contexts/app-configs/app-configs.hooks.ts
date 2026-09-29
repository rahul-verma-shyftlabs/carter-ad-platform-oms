import { useSelector } from 'react-redux';
import { IRootState } from '@/redux/reducers';

const useConfigs = () => {
  return useSelector((state: IRootState) => state.common.configs);
};

export default useConfigs;
