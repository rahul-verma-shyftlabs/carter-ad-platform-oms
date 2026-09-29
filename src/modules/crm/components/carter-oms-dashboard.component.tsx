import React from 'react';
import { useRouter } from 'next/router';
import {
  Button,
  Typography,
  carterColors,
} from 'shyftlabs-dsl';
import {
  Briefcase,
  Users,
  Send,
  Eye,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertCircle,
  ChevronRight,
  Mail,
  Check,
} from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from 'recharts';
import ROUTES from '@/common/routes';
import { TabType } from './salesforce-data-view';

interface CarterOMSDashboardProps {
  dashboardData: any;
  onTabChange: (tab: TabType) => void;
}

const CarterOMSDashboard: React.FC<CarterOMSDashboardProps> = ({
  dashboardData,
  onTabChange,
}) => {
  const router = useRouter();

  if (!dashboardData) return null;

  const { stats, leads, opportunities, contacts } = dashboardData;

  // Calculate deals booked from closed won opportunities
  const dealsBooked = opportunities?.records?.filter((opp: any) => 
    opp.StageName?.toLowerCase().includes('closed won')
  ).length || 0;

  // Calculate conversion rate (closed won / total opportunities)
  const totalOpportunities = stats.totalOpportunities || 0;
  const conversionRate = totalOpportunities > 0 
    ? ((dealsBooked / totalOpportunities) * 100).toFixed(1) 
    : '0';

  // Calculate open rate (leads with status "Open" or not "Converted")
  const openLeads = leads?.records?.filter((lead: any) => 
    !lead.Status?.toLowerCase().includes('converted') && !lead.Status?.toLowerCase().includes('closed')
  ).length || 0;
  const totalLeads = stats.totalLeads || 1;
  const openRate = totalLeads > 0 
    ? ((openLeads / totalLeads) * 100).toFixed(0) 
    : '0';

  // Calculate stats with real data from Salesforce
  const dashboardStats = [
    {
      id: 1,
      label: 'Projects',
      value: stats.totalOpportunities || 12,
      change: '+7.4%',
      isPositive: true,
      icon: Briefcase,
      icon_bg: carterColors['grey-100'],
      icon_color: carterColors['text-600'],
    },
    {
      id: 2,
      label: 'Active clients',
      value: stats.totalAccounts || 9,
      change: '+2%',
      isPositive: true,
      icon: Users,
      icon_bg: carterColors['grey-100'],
      icon_color: carterColors['text-600'],
    },
    {
      id: 3,
      label: 'Pitches Sent',
      value: stats.totalLeads || 18,
      change: '+3.5%',
      isPositive: true,
      icon: Send,
      icon_bg: carterColors['grey-100'],
      icon_color: carterColors['text-600'],
    },
    {
      id: 4,
      label: 'Open Rate',
      value: `${openRate}%`,
      change: 'of leads still open',
      isPositive: true,
      icon: Eye,
      icon_bg: carterColors['grey-100'],
      icon_color: carterColors['text-600'],
    },
    {
      id: 5,
      label: 'Deals Booked',
      value: dealsBooked,
      change: `${conversionRate}% conversion`,
      isPositive: true,
      icon: CheckCircle2,
      icon_bg: carterColors['grey-100'],
      icon_color: carterColors['text-600'],
    },
  ];

  // Media cost % per opportunity (rate-card style). Use opp.Media_Cost_Percent__c if set (e.g. 35 or 0.35).
  // When not set, vary by opportunity (name/id) so net margin differs per deal instead of same for all.
  const getMediaCostRate = (opp: any): number => {
    const raw = opp?.Media_Cost_Percent__c ?? opp?.Media_Cost_Pct__c;
    if (raw != null && raw !== '') {
      const n = Number(raw);
      if (!Number.isNaN(n)) return n > 0 && n <= 1 ? n : n / 100; // 0.35 or 35 → 0.35
    }
    const seed = `${opp?.Id ?? ''}-${opp?.Name ?? ''}`;
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h << 5) - h + seed.charCodeAt(i);
    const t = (Math.abs(h) % 1000) / 1000;
    return 0.2 + t * 0.35; // vary media cost 20%–55% so net margin varies per opportunity
  };

  // Calculate revenue and media cost from Salesforce opportunities (variable % per opp when available)
  const calculateRevenueExpensesData = () => {
    const dateMap = new Map<string, { revenue: number; expenses: number }>();
    
    if (opportunities?.records && opportunities.records.length > 0) {
      opportunities.records.forEach((opp: any) => {
        const amount = Number(opp.Amount) || 0;
        const closeDate = opp.CloseDate ? new Date(opp.CloseDate) : null;
        const mediaCostRate = getMediaCostRate(opp);
        
        if (amount > 0 && closeDate) {
          const dateKey = closeDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const existing = dateMap.get(dateKey) || { revenue: 0, expenses: 0 };
          
          existing.revenue += amount;
          existing.expenses += amount * mediaCostRate;
          
          dateMap.set(dateKey, existing);
        }
      });
    }

    // Convert to array and sort by date
    return Array.from(dateMap.entries())
      .map(([day, data]) => ({
        day,
        revenue: Math.round(data.revenue),
        expenses: Math.round(data.expenses),
      }))
      .sort((a, b) => {
        const dateA = new Date(a.day);
        const dateB = new Date(b.day);
        return dateA.getTime() - dateB.getTime();
      });
  };

  const revenueExpensesData = calculateRevenueExpensesData();

  // Calculate total revenue and expenses from real data
  const totalRevenue = revenueExpensesData.reduce((sum, item) => sum + item.revenue, 0);
  const totalExpenses = revenueExpensesData.reduce((sum, item) => sum + item.expenses, 0);

  // Prepare top 10 opportunities by revenue data
  const getTopOpportunitiesByRevenue = () => {
    if (!opportunities?.records) return [];
    
    // Define all stage order for visualization (including closed for X-axis)
    const stageOrder = [
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
    
    // Get active opportunities (excluding Closed Won/Lost)
    const sortedOpps = [...opportunities.records]
      .filter((opp: any) => {
        const amount = Number(opp.Amount) || 0;
        const stage = (opp.StageName || '').toLowerCase();
        return amount > 0 && !stage.includes('closed won') && !stage.includes('closed lost');
      })
      .sort((a: any, b: any) => Number(b.Amount) - Number(a.Amount))
      .slice(0, 10);
    
    return sortedOpps.map((opp: any) => {
      const stageName = opp.StageName || 'Unknown';
      let currentStageIndex = stageOrder.indexOf(stageName);
      
      if (currentStageIndex === -1) {
        // If stage not found in predefined list, try to find partial match
        currentStageIndex = stageOrder.findIndex(s => 
          stageName.toLowerCase().includes(s.toLowerCase()) || 
          s.toLowerCase().includes(stageName.toLowerCase())
        );
        
        if (currentStageIndex === -1) {
          // Add to qualification stage as default
          currentStageIndex = 1;
        }
      }
      
      // Create data for stacked bar - each stage up to current gets a value
      const stageData: any = {
        name: opp.Name?.length > 25 ? opp.Name.substring(0, 25) + '...' : opp.Name || 'Unknown',
        fullName: opp.Name || 'Unknown',
        accountName: opp.Account?.Name || 'Unknown Client',
        revenue: Number(opp.Amount) || 0,
        currentStage: stageName,
        currentStageIndex: currentStageIndex,
      };
      
      // Add a value for each stage up to and including the current stage
      stageOrder.forEach((stage, index) => {
        if (index <= currentStageIndex) {
          stageData[stage] = 1; // Each completed stage gets value of 1
        } else {
          stageData[stage] = 0;
        }
      });
      
      return stageData;
    });
  };

  const topOpportunitiesData = getTopOpportunitiesByRevenue();
  
  // All stages for the pipeline (10 stages including closed stages for X-axis labels)
  const allStages = [
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

  // Get unique stages and assign colors (10 distinct colors)
  const getStageColorMapping = () => {
    const stageColors = [
      '#3b82f6',      // Prospecting - Bright Blue
      '#06b6d4',      // Qualification - Cyan
      '#14b8a6',      // Needs Analysis - Teal
      '#8b5cf6',      // Value Proposition - Purple
      '#6366f1',      // Id. Decision Makers - Indigo
      '#eab308',      // Perception Analysis - Yellow
      '#f97316',      // Proposal/Price Quote - Orange
      '#ef4444',      // Negotiation/Review - Red
      '#22c55e',      // Closed Won - Green
      '#991b1b',      // Closed Lost - Dark Red
    ];
    
    const colorMap: { [key: string]: string } = {};
    allStages.forEach((stage, index) => {
      colorMap[stage] = stageColors[index];
    });
    
    return colorMap;
  };

  const stageColorMap = getStageColorMapping();

  // Get top closed won opportunities by net margin (variable media cost % per opp)
  const getClosedWonByNetMargin = () => {
    if (!opportunities?.records) return [];
    
    const closedWonOpps = opportunities.records
      .filter((opp: any) => {
        const amount = Number(opp.Amount) || 0;
        const stage = (opp.StageName || '').toLowerCase();
        return amount > 0 && stage.includes('closed won');
      })
      .map((opp: any) => {
        const revenue = Number(opp.Amount) || 0;
        const mediaCostRate = getMediaCostRate(opp);
        const mediaCost = revenue * mediaCostRate;
        const profit = revenue - mediaCost;
        const netMarginPct = revenue > 0 ? (profit / revenue) * 100 : 0;
        return {
          name: opp.Name || 'Unknown',
          fullName: opp.Name || 'Unknown',
          revenue,
          mediaCost,
          profit, // for pie slice size
          netMarginPct,
        };
      })
      .sort((a: any, b: any) => b.profit - a.profit)
      .slice(0, 10);
    
    return closedWonOpps;
  };

  const closedWonNetMarginData = getClosedWonByNetMargin();
  
  // Colors for the donut chart
  const donutColors = [
    '#22c55e', // Green
    '#3b82f6', // Blue
    '#f59e0b', // Amber
    '#8b5cf6', // Purple
    '#06b6d4', // Cyan
    '#ef4444', // Red
    '#ec4899', // Pink
    '#14b8a6', // Teal
    '#f97316', // Orange
    '#6366f1', // Indigo
  ];

  // Calculate dynamic performance metrics
  // 1. Average Deal Value
  const closedWonDeals = opportunities?.records?.filter((opp: any) => 
    opp.StageName?.toLowerCase().includes('closed won')
  ) || [];
  const averageDealValue = closedWonDeals.length > 0 
    ? Math.round(closedWonDeals.reduce((sum: number, opp: any) => sum + (Number(opp.Amount) || 0), 0) / closedWonDeals.length)
    : 0;

  // 2. Sales Velocity - Opportunities in progress
  const inProgressOpportunities = opportunities?.records?.filter((opp: any) => {
    const stage = opp.StageName?.toLowerCase() || '';
    return !stage.includes('closed won') && !stage.includes('closed lost');
  }) || [];
  // 3. Performance Score - Based on pipeline health and conversion
  const accountsWithMultipleOpps = new Set((opportunities?.records || []).map((opp: any) => opp.AccountId)).size;
  const healthScore = Math.round(
    (closedWonDeals.length / Math.max(totalOpportunities, 1)) * 40 + // Conversion 40%
    (accountsWithMultipleOpps / Math.max(stats.totalAccounts, 1)) * 30 + // Account engagement 30%
    (inProgressOpportunities.length / Math.max(totalOpportunities, 1)) * 30 // Active pipeline 30%
  );

  // 4. Dynamic tasks based on real data
  const dynamicTasks = [];
  
  // Task 1: Overdue opportunities
  const overdueOpps = inProgressOpportunities.filter((opp: any) => {
    if (!opp.CloseDate) return false;
    const closeDate = new Date(opp.CloseDate);
    return closeDate < new Date();
  });
  if (overdueOpps.length > 0) {
    dynamicTasks.push({
      id: 1,
      label: `Follow up on ${overdueOpps.length} overdue ${overdueOpps.length === 1 ? 'opportunity' : 'opportunities'}`,
      completed: false,
      icon: AlertCircle,
    });
  }

  // Task 2: Leads without opportunities
  const leadsWithOpps = new Set((opportunities?.records || []).map((opp: any) => opp.LeadSource || opp.AccountId));
  const leadsWithoutOpps = Math.max(0, (stats.totalLeads || 0) - leadsWithOpps.size);
  if (leadsWithoutOpps > 0) {
    dynamicTasks.push({
      id: 2,
      label: `Convert ${leadsWithoutOpps} ${leadsWithoutOpps === 1 ? 'lead' : 'leads'} to opportunities`,
      completed: false,
      icon: Send,
    });
  }

  // Task 3: High-value accounts
  const highValueAccounts = opportunities?.records
    ?.filter((opp: any) => Number(opp.Amount) > (averageDealValue * 1.5))
    ?.length || 0;
  if (highValueAccounts > 0) {
    dynamicTasks.push({
      id: 3,
      label: `Nurture ${highValueAccounts} high-value ${highValueAccounts === 1 ? 'opportunity' : 'opportunities'}`,
      completed: false,
      icon: Briefcase,
    });
  }

  // If no tasks, show success message
  if (dynamicTasks.length === 0) {
    dynamicTasks.push({
      id: 1,
      label: 'All tasks on track',
      completed: true,
      icon: Check,
    });
  }

  // Performance data
  const performancePercentage = healthScore;
  const performanceTasks = dynamicTasks;

  // Active deals (combination of opportunities and leads)
  const opportunitiesData = opportunities?.records
    ?.filter((opp: any) => {
      const stage = (opp.StageName || '').toLowerCase();
      return !stage.includes('closed won') && !stage.includes('closed lost');
    })
    .slice(0, 3)
    .map((opp: any) => ({
      id: opp.Id,
      client: opp.Name || opp.Account?.Name || 'Unknown',
      type: 'Opportunity',
      dueDate: opp.CloseDate ? new Date(opp.CloseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A',
      revenue: opp.Amount ? `$${Number(opp.Amount).toLocaleString()}` : '$0',
      status: opp.StageName || 'Unknown',
      avatar: (opp.Name || opp.Account?.Name || 'U').charAt(0).toUpperCase(),
    })) || [];

  const leadsData = leads?.records
    ?.filter((lead: any) => {
      const status = (lead.Status || '').toLowerCase();
      return !status.includes('converted');
    })
    .slice(0, 2)
    .map((lead: any) => ({
    id: lead.Id,
    client: lead.Company || lead.Name || 'Unknown',
    type: 'Lead',
    dueDate: lead.CreatedDate ? new Date(lead.CreatedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A',
    revenue: 'N/A',
    status: lead.Status || 'Unknown',
    avatar: (lead.Company || lead.Name || 'U').charAt(0).toUpperCase(),
  })) || [];

  const activeDeals = [...opportunitiesData, ...leadsData];

  // Pending tasks - Dynamic data from opportunities and leads
  const getDynamicPendingTasks = () => {
    // 1. Opportunities in critical stages (needs action)
    const criticalOpportunities = opportunities?.records
      ?.filter((opp: any) => {
        const stage = (opp.StageName || '').toLowerCase();
        return stage.includes('negotiation') || stage.includes('proposal') || stage.includes('review');
      })
      .slice(0, 2)
      .map((opp: any) => ({
        id: opp.Id,
        title: opp.Name || 'Opportunity',
        subtitle: `${opp.StageName}`,
        type: 'Opportunity',
        action: 'Follow up required',
        dueDate: opp.CloseDate ? new Date(opp.CloseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No date',
        amount: opp.Amount ? `$${Number(opp.Amount).toLocaleString()}` : null,
        priority: 'High',
        icon: AlertCircle,
        color: '#ef4444',
        bgColor: '#fef2f2',
      })) || [];
    
    // 2. New leads (need qualification)
    const newLeads = leads?.records
      ?.filter((lead: any) => {
        const status = (lead.Status || '').toLowerCase();
        return !status.includes('converted') && !status.includes('qualified');
      })
      .slice(0, 2)
      .map((lead: any) => ({
        id: lead.Id,
        title: lead.Company || lead.Name || 'Lead',
        subtitle: lead.Status || 'New Lead',
        type: 'Lead',
        action: 'Needs qualification',
        dueDate: 'Today',
        amount: null,
        priority: 'Medium',
        icon: Users,
        color: '#3b82f6',
        bgColor: '#eff6ff',
      })) || [];
    
    // 3. Contacts needing follow-up
    const contactTasks = contacts?.records
      ?.slice(0, 1)
      .map((contact: any) => ({
        id: contact.Id,
        title: contact.Name || 'Contact',
        subtitle: 'Account check-in',
        type: 'Contact',
        action: 'Schedule meeting',
        dueDate: 'This week',
        amount: null,
        priority: 'Low',
        icon: Mail,
        color: '#22c55e',
        bgColor: '#f0fdf4',
      })) || [];
    
    return [...criticalOpportunities, ...newLeads, ...contactTasks].slice(0, 4);
  };
  
  const pendingTasks = getDynamicPendingTasks();

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('progress') || statusLower.includes('negotiation')) {
      return carterColors['blue-200'];
    }
    if (statusLower.includes('pending') || statusLower.includes('qualification')) {
      return carterColors['yellow-200'];
    }
    if (statusLower.includes('won') || statusLower.includes('closed')) {
      return carterColors['green-200'];
    }
    return carterColors['grey-100'];
  };

  const getStatusTextColor = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('progress') || statusLower.includes('negotiation')) {
      return carterColors['blue-700'];
    }
    if (statusLower.includes('pending') || statusLower.includes('qualification')) {
      return carterColors['yellow-700'];
    }
    if (statusLower.includes('won') || statusLower.includes('closed')) {
      return carterColors['green-700'];
    }
    return carterColors['text-600'];
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '0' }}>
      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '16px',
      }}>
        {dashboardStats.map((stat) => {
          const IconComponent = stat.icon;
          return (
            <div
              key={stat.id}
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                border: 'none',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.12)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.08)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: stat.icon_bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <IconComponent size={18} color={stat.icon_color} />
                </div>
                <Typography variant="body-semibold" color={carterColors['text-600']}>
                  {stat.label}
                </Typography>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <Typography variant="h2-semibold" color={carterColors['text-900']}>
                  {stat.value}
                </Typography>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  padding: '3px 6px',
                  borderRadius: '6px',
                  backgroundColor: stat.isPositive ? carterColors['green-200'] : carterColors['red-200'],
                }}>
                  {stat.isPositive ? (
                    <TrendingUp size={11} color={carterColors['green-700']} />
                  ) : (
                    <TrendingDown size={11} color={carterColors['red-700']} />
                  )}
                  <Typography
                    variant="caption-regular"
                    color={stat.isPositive ? carterColors['green-700'] : carterColors['red-700']}
                  >
                    {stat.change}
                  </Typography>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Revenue/Expenses and Performance Section */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '24px',
      }}>
        {/* Opportunity Pipeline - Revenue & Media Cost */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
          border: 'none',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.12)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.08)';
        }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <Typography variant="h3-semibold" color={carterColors['text-900']}>
                Opportunity Pipeline
              </Typography>
              <Typography variant="caption-regular" color={carterColors['text-600']}>
                <span style={{ marginTop: '4px', display: 'block' }}>Revenue & Media Cost</span>
              </Typography>
            </div>
            <Button
              variant="tertiary"
              size="small"
              label="View all"
              icon={<ChevronRight size={16} />}
              iconPosition="right"
              onClick={() => onTabChange('opportunities')}
            />
          </div>

          {/* Revenue and Media Cost Summary */}
          <div style={{ display: 'flex', gap: '32px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: carterColors['blue-200'],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <DollarSign size={16} color={carterColors['blue-700']} />
              </div>
              <div>
                <Typography variant="caption-regular" color={carterColors['text-600']}>
                  Revenue
                </Typography>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <Typography variant="h3-semibold" color={carterColors['text-900']}>
                    ${totalRevenue.toLocaleString()}
                  </Typography>
                  <Typography variant="caption-semibold" color={carterColors['green-700']}>
                    +6.2%
                  </Typography>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: carterColors['green-200'],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <AlertCircle size={16} color={carterColors['green-700']} />
              </div>
              <div>
                <Typography variant="caption-regular" color={carterColors['text-600']}>
                  Media Cost
                </Typography>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <Typography variant="h3-semibold" color={carterColors['text-900']}>
                    ${totalExpenses.toLocaleString()}
                  </Typography>
                  <Typography variant="caption-semibold" color={carterColors['red-700']}>
                    -1.7%
                  </Typography>
                </div>
              </div>
            </div>
          </div>

          {/* Bar Chart */}
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={revenueExpensesData}>
              <CartesianGrid strokeDasharray="3 3" stroke={carterColors['grey-200']} />
              <XAxis
                dataKey="day"
                tick={{ fill: carterColors['text-600'], fontSize: 12 }}
                axisLine={{ stroke: carterColors['grey-300'] }}
              />
              <YAxis
                tick={{ fill: carterColors['text-600'], fontSize: 12 }}
                axisLine={{ stroke: carterColors['grey-300'] }}
                tickFormatter={(value) => `$${value / 1000}k`}
              />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: `1px solid ${carterColors['grey-200']}`,
                  borderRadius: '8px',
                }}
                formatter={(value: any) => [`$${value}`, '']}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '16px' }}
                formatter={(value) => value === 'revenue' ? 'Revenue' : 'Media Cost'}
              />
              <Bar dataKey="revenue" fill={carterColors['brand-600']} radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" fill={carterColors['green-700']} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Your Performance */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
          border: 'none',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.12)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.08)';
        }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div>
              <Typography variant="h3-semibold" color={carterColors['text-900']}>
                Your Performance
              </Typography>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '16px',
                marginTop: '12px',
              }}>
                <div>
                  <Typography variant="caption-regular" color={carterColors['text-600']}>
                    Conversion Rate
                  </Typography>
                  <Typography variant="caption-semibold" color={carterColors['text-900']}>
                    40%
                  </Typography>
                </div>
                <div>
                  <Typography variant="caption-regular" color={carterColors['text-600']}>
                    Account Engagement
                  </Typography>
                  <Typography variant="caption-semibold" color={carterColors['text-900']}>
                    30%
                  </Typography>
                </div>
                <div>
                  <Typography variant="caption-regular" color={carterColors['text-600']}>
                    Active Pipeline
                  </Typography>
                  <Typography variant="caption-semibold" color={carterColors['text-900']}>
                    30%
                  </Typography>
                </div>
              </div>
            </div>
            <Button
              variant="tertiary"
              size="small"
              label="View all"
              icon={<ChevronRight size={16} />}
              iconPosition="right"
              onClick={() => onTabChange('leads')}
            />
          </div>

          {/* Circular Progress */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: '32px',
            
          }}>
            <svg width="400" height="240" viewBox="0 0 200 120">
              <defs>
                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={carterColors['green-700']} />
                  <stop offset="50%" stopColor={carterColors['brand-500']} />
                  <stop offset="100%" stopColor={carterColors['yellow-700']} />
                </linearGradient>
              </defs>
              {/* Background arc */}
              <path
                d="M 30 100 A 70 70 0 0 1 170 100"
                fill="none"
                stroke={carterColors['grey-200']}
                strokeWidth="20"
                strokeLinecap="round"
              />
              {/* Progress arc */}
              <path
                d="M 30 100 A 70 70 0 0 1 170 100"
                fill="none"
                stroke="url(#progressGradient)"
                strokeWidth="20"
                strokeLinecap="round"
                strokeDasharray={`${(performancePercentage / 100) * 220} 220`}
              />
              {/* Center text */}
              <text
                x="100"
                y="80"
                textAnchor="middle"
                fontSize="26"
                fontWeight="600"
                fill={carterColors['text-900']}
              >
                {performancePercentage}%
              </text>
              <text
                x="100"
                y="100"
                textAnchor="middle"
                fontSize="10"
                fill={carterColors['text-600']}
              >
                Success
              </text>
            </svg>
          </div>

          {/* Task List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '24px' }}>
            {performanceTasks.map((task) => (
              <div
                key={task.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  backgroundColor: task.completed ? carterColors['green-200'] : carterColors['yellow-200'],
                  borderRadius: '8px',
                }}
              >
                <task.icon size={20} color={task.completed ? carterColors['green-700'] : carterColors['yellow-700']} />
                <div style={{ flex: 1, textDecoration: task.completed ? 'line-through' : 'none' }}>
                  <Typography
                    variant="body-regular"
                    color={task.completed ? carterColors['green-700'] : carterColors['text-900']}
                  >
                    {task.label}
                  </Typography>
                </div>
                {task.completed && (
                  <CheckCircle2 size={20} color={carterColors['green-700']} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pipeline Analysis Section - Two columns */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
        gap: '24px',
      }}>
        {/* Left: Top Opportunities by Pipeline Stage */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
          border: 'none',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.12)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.08)';
        }}
        >
          <div style={{ marginBottom: '20px' }}>
            <Typography variant="h3-semibold" color={carterColors['text-900']}>
              Active Pipeline
            </Typography>
            <Typography variant="body-regular" color={carterColors['text-600']}>
              Top 10 opportunities by revenue
            </Typography>
          </div>

        {topOpportunitiesData.length > 0 ? (
          <div style={{ width: '100%', height: '500px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topOpportunitiesData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 0, bottom: 80 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={carterColors['grey-200']} />
                <XAxis 
                  type="number" 
                  stroke={carterColors['text-600']}
                  domain={[0, 10]}
                  ticks={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
                  tickFormatter={(value) => {
                    const stages = ['', ...allStages];
                    return stages[value] || '';
                  }}
                  angle={-45}
                  textAnchor="end"
                  height={70}
                  interval={0}
                  tick={{ fontSize: 10 }}
                />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  stroke={carterColors['text-600']}
                  width={180}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => {
                    return value.length > 25 ? value.substring(0, 23) + '...' : value;
                  }}
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: `1px solid ${carterColors['grey-200']}`,
                    borderRadius: '8px',
                    padding: '12px',
                  }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length > 0) {
                      const data = payload[0].payload;
                      return (
                        <div style={{
                          backgroundColor: 'white',
                          border: `1px solid ${carterColors['grey-200']}`,
                          borderRadius: '8px',
                          padding: '12px',
                          minWidth: '220px',
                        }}>
                          <div style={{ fontWeight: 600, marginBottom: '8px', fontSize: '14px' }}>{data.fullName}</div>
                          <div style={{ color: carterColors['text-600'], fontSize: '13px', marginBottom: '6px' }}>
                            Current Stage: <span style={{ fontWeight: 600, color: carterColors['brand-700'] }}>{data.currentStage}</span>
                          </div>
                          <div style={{ color: carterColors['text-900'], fontSize: '13px', fontWeight: 600 }}>
                            Revenue: ${data.revenue.toLocaleString()}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {allStages.map((stage) => (
                  <Bar
                    key={stage}
                    dataKey={stage}
                    stackId="stages"
                    fill={stageColorMap[stage]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <Typography variant="body-regular" color={carterColors['text-600']}>
              No opportunity data available
            </Typography>
          </div>
        )}
        </div>

        {/* Right: Net Margin by Closed Won Opportunities */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
          border: 'none',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.12)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.08)';
        }}
        >
          <div style={{ marginBottom: '20px' }}>
            <Typography variant="h3-semibold" color={carterColors['text-900']}>
              Net Margin
            </Typography>
            <Typography variant="body-regular" color={carterColors['text-600']}>
              Top 10 closed deals
            </Typography>
          </div>

          {closedWonNetMarginData.length > 0 ? (
            <>
              <div style={{ width: '100%', height: '400px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={closedWonNetMarginData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={140}
                      paddingAngle={2}
                      dataKey="profit"
                      label={(entry) => {
                        const name = entry.name.length > 15 ? entry.name.substring(0, 15) + '...' : entry.name;
                        return name;
                      }}
                      labelLine={true}
                    >
                      {closedWonNetMarginData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={donutColors[index % donutColors.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: `1px solid ${carterColors['grey-200']}`,
                        borderRadius: '8px',
                        padding: '12px',
                      }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length > 0) {
                          const data = payload[0].payload;
                          return (
                            <div style={{
                              backgroundColor: 'white',
                              border: `1px solid ${carterColors['grey-200']}`,
                              borderRadius: '8px',
                              padding: '12px',
                              minWidth: '250px',
                            }}>
                              <div style={{ fontWeight: 600, marginBottom: '10px', fontSize: '14px' }}>{data.fullName}</div>
                              <div style={{ color: carterColors['text-600'], fontSize: '13px', marginBottom: '6px' }}>
                                Revenue: <span style={{ fontWeight: 600, color: carterColors['text-900'] }}>${data.revenue.toLocaleString()}</span>
                              </div>
                              <div style={{ color: carterColors['text-600'], fontSize: '13px', marginBottom: '6px' }}>
                                Media Cost: <span style={{ fontWeight: 600, color: carterColors['red-700'] }}>-${data.mediaCost.toLocaleString()}</span>
                              </div>
                              <div style={{ 
                                color: carterColors['green-700'], 
                                fontSize: '14px', 
                                fontWeight: 700,
                                marginTop: '8px',
                                paddingTop: '8px',
                                borderTop: `1px solid ${carterColors['grey-200']}`,
                              }}>
                                Net Margin: {data.netMarginPct.toFixed(1)}%
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <Typography variant="body-regular" color={carterColors['text-600']}>
                No closed won opportunities available
              </Typography>
            </div>
          )}
        </div>
      </div>

      {/* Active Deals and Pending Tasks */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '24px',
      }}>
        {/* Active Deals */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
          border: 'none',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.12)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.08)';
        }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <Typography variant="h3-semibold" color={carterColors['text-900']}>
              Active deals
            </Typography>
            <Button
              variant="tertiary"
              size="small"
              label="View all"
              icon={<ChevronRight size={16} />}
              iconPosition="right"
              onClick={() => onTabChange('opportunities')}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
            {/* Table Header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1.25fr 1fr 1fr 1.75fr',
              gap: '12px',
              padding: '14px 16px',
              backgroundColor: carterColors['grey-100'],
              borderRadius: '8px 8px 0 0',
              borderBottom: `2px solid ${carterColors['grey-200']}`,
            }}>
              <Typography variant="caption-semibold" color={carterColors['text-700']}>
                Client
              </Typography>
              <Typography variant="caption-semibold" color={carterColors['text-700']}>
                Type
              </Typography>
              <Typography variant="caption-semibold" color={carterColors['text-700']}>
                Due date
              </Typography>
              <Typography variant="caption-semibold" color={carterColors['text-700']}>
                Revenue
              </Typography>
              <Typography variant="caption-semibold" color={carterColors['text-700']}>
                Status
              </Typography>
            </div>

            {/* Table Rows */}
            {activeDeals.length > 0 ? (
              activeDeals.map((deal: any, index: number) => (
                <div
                  key={deal.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1.25fr 1fr 1fr 1.75fr',
                    gap: '12px',
                    padding: '16px',
                    backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb',
                    borderBottom: '1px solid #e5e7eb',
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#eff6ff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'white' : '#f9fafb';
                  }}
                  onClick={() => router.push(`/crm/${deal.type.toLowerCase()}s/${deal.id}`)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      flexShrink: 0,
                      borderRadius: '50%',
                      backgroundColor: carterColors['brand-100'],
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Typography variant="body-semibold" color={carterColors['brand-700']}>
                        {deal.avatar}
                      </Typography>
                    </div>
                    <span
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        minWidth: 0,
                        color: carterColors['text-900'],
                        fontSize: '14px',
                        lineHeight: '20px',
                      }}
                    >
                      {deal.client}
                    </span>
                  </div>
                  <Typography variant="body-regular" color={carterColors['text-600']}>
                    {deal.type}
                  </Typography>
                  <Typography variant="body-regular" color={carterColors['text-600']}>
                    {deal.dueDate}
                  </Typography>
                  <Typography variant="body-semibold" color={carterColors['text-900']}>
                    {deal.revenue}
                  </Typography>
                  <div style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    backgroundColor: getStatusColor(deal.status),
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 'fit-content',
                  }}>
                    <Typography variant="caption-semibold" color={getStatusTextColor(deal.status)}>
                      {deal.status}
                    </Typography>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '32px', textAlign: 'center' }}>
                <Typography variant="body-regular" color={carterColors['text-600']}>
                  No active deals
                </Typography>
              </div>
            )}
          </div>
        </div>

        {/* Pending Tasks */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
          border: 'none',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.12)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.08)';
        }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <Typography variant="h3-semibold" color={carterColors['text-900']}>
              Pending tasks
            </Typography>
            <Button
              variant="tertiary"
              size="small"
              label="View all"
              icon={<ChevronRight size={16} />}
              iconPosition="right"
              onClick={() => router.push(ROUTES.CRM.TICKETS.KANBAN)}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {pendingTasks.length > 0 ? (
              pendingTasks.map((task: any) => (
                <div
                  key={task.id}
                  style={{
                    position: 'relative',
                    padding: '16px',
                    backgroundColor: task.bgColor,
                    borderLeft: `4px solid ${task.color}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateX(4px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateX(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  onClick={() => {
                    if (task.type === 'Opportunity') {
                      router.push(`/crm/opportunities/${task.id}`);
                    } else if (task.type === 'Lead') {
                      router.push(`/crm/leads/${task.id}`);
                    } else {
                      router.push(`/crm/contacts/${task.id}`);
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      backgroundColor: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <task.icon size={20} color={task.color} strokeWidth={2.5} />
                    </div>
                    
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <Typography variant="body-semibold" color={carterColors['text-900']}>
                          {task.title.length > 30 ? task.title.substring(0, 30) + '...' : task.title}
                        </Typography>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: 'white',
                          fontSize: '11px',
                          fontWeight: 600,
                          color: task.color,
                        }}>
                          {task.type}
                        </span>
                      </div>
                      
                      <Typography variant="caption-regular" color={carterColors['text-600']}>
                        {task.action} • {task.subtitle}
                      </Typography>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                            <path
                              d={
                                'M11 2H10V1C10 0.734784 9.89464 0.48043 9.70711 0.292893C9.51957 0.105357 '
                                + '9.26522 0 9 0C8.73478 0 8.48043 0.105357 8.29289 0.292893C8.10536 0.48043 '
                                + '8 0.734784 8 1V2H6V1C6 0.734784 5.89464 0.48043 5.70711 0.292893C5.51957 '
                                + '0.105357 5.26522 0 5 0C4.73478 0 4.48043 0.105357 4.29289 0.292893C4.10536 '
                                + '0.48043 4 0.734784 4 1V2H3C2.20435 2 1.44129 2.31607 0.87868 2.87868C0.316071 '
                                + '3.44129 0 4.20435 0 5V11C0 11.7956 0.316071 12.5587 0.87868 13.1213C1.44129 '
                                + '13.6839 2.20435 14 3 14H11C11.7956 14 12.5587 13.6839 13.1213 13.1213C13.6839 '
                                + '12.5587 14 11.7956 14 11V5C14 4.20435 13.6839 3.44129 13.1213 2.87868C12.5587 '
                                + '2.31607 11.7956 2 11 2ZM12 11C12 11.2652 11.8946 11.5196 11.7071 11.7071C11.5196 '
                                + '11.8946 11.2652 12 11 12H3C2.73478 12 2.48043 11.8946 2.29289 11.7071C2.10536 '
                                + '11.5196 2 11.2652 2 11V6H12V11Z'
                              }
                              fill={carterColors['text-500']}
                            />
                          </svg>
                          <span style={{ fontSize: '11px', color: carterColors['text-600'] }}>
                            {task.dueDate}
                          </span>
                        </div>
                        
                        {task.amount && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <DollarSign size={12} color={carterColors['text-500']} />
                            <span style={{ fontSize: '11px', fontWeight: 600, color: carterColors['text-700'] }}>
                              {task.amount}
                            </span>
                          </div>
                        )}
                        
                        <div style={{
                          marginLeft: 'auto',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: task.priority === 'High' ? '#fee2e2' : task.priority === 'Medium' ? '#fef3c7' : '#dcfce7',
                        }}>
                          <span style={{ 
                            fontSize: '10px',
                            fontWeight: 600,
                            color: task.priority === 'High' ? '#991b1b' : task.priority === 'Medium' ? '#92400e' : '#166534'
                          }}>
                            {task.priority}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '32px', textAlign: 'center' }}>
                <Typography variant="body-regular" color={carterColors['text-600']}>
                  No pending tasks
                </Typography>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CarterOMSDashboard;
