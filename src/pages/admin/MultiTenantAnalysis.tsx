
import React from 'react';
import Layout from '@/components/layout/Layout';
import MultiTenantStorageAnalyzer from '@/components/admin/MultiTenantStorageAnalyzer';

const MultiTenantAnalysis = () => {
  return (
    <Layout>
      <div className="container mx-auto p-6">
        <MultiTenantStorageAnalyzer />
      </div>
    </Layout>
  );
};

export default MultiTenantAnalysis;
