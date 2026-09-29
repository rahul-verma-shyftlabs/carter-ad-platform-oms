import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { Button } from 'shyftlabs-dsl';
import { setOmsSession } from '@/lib/oms-session';
import { setUser } from '@/redux/actions';
import ROUTES from '@/common/routes';

const DevSessionPage = () => {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [rmnToken, setRmnToken] = useState('');
  const [crmBackendToken, setCrmBackendToken] = useState('');

  if (process.env.NODE_ENV === 'production') {
    return <p>Not available</p>;
  }

  return (
    <div style={{ maxWidth: 480, margin: '80px auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h1>OMS standalone session</h1>
      <label>
        User ID
        <input value={userId} onChange={event => setUserId(event.target.value)} />
      </label>
      <label>
        RMN token
        <input value={rmnToken} onChange={event => setRmnToken(event.target.value)} />
      </label>
      <label>
        CRM backend token
        <input value={crmBackendToken} onChange={event => setCrmBackendToken(event.target.value)} />
      </label>
      <Button
        label="Save session"
        onClick={() => {
          setOmsSession({ userId, rmnToken, crmBackendToken });
          setUser({ id: userId });
          void router.push(ROUTES.CRM.BASE);
        }}
      />
    </div>
  );
};

export default DevSessionPage;
