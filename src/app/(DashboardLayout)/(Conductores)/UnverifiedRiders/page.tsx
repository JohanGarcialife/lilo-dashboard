'use client';

import PageContainer from '@/app/(DashboardLayout)/components/container/PageContainer';
import Riders from '../_components/Riders';




const SamplePage = () => {
  return (
    <PageContainer title="Unverified Riders" description="Riders with unverified status">

        <Riders />
      
    </PageContainer>
  );
};

export default SamplePage;

