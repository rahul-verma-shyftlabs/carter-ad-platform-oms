import React from 'react';
import { useRouter } from 'next/router';
import {
  Button,
  Typography,
  carterColors,
  CarterDateRangePicker,
  ButtonGroup,
} from 'shyftlabs-dsl';
import {
  Users,
  User,
  UserCheck,
  Briefcase,
  Building2,
  TrendingUp,
  ExternalLink,
  Pencil,
  ChevronRight,
} from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis, Legend, CartesianGrid } from 'recharts';
import DateTimeParser, { DateTimeType } from '@/lib/date-time-parser';
import { DATE_FORMAT } from '@/common/constants';
import { isDateRangeAllowed } from '@/common/helpers';
import { showAlert } from '@/redux/actions';
import ROUTES from '@/common/routes';
import { DashboardProps, DATE_FILTER_ENUM } from '../types';
import styles from '../../../styles/crm.module.scss';

const SalesforceDashboard: React.FC<DashboardProps> = ({
  dashboardData,
  calculateQuarterlyPerformance,
  dateFilter,
  dateRange,
  goalValue,
  isEditingGoal,
  goalInputValue,
  hoveredCardIndex,
  timeZone,
  account,
  onDateFilterChange,
  onDateRangeChange,
  onGoalValueChange,
  onGoalInputChange,
  onEditingGoalChange,
  onHoveredCardIndexChange,
  onTabChange,
}) => {
  const router = useRouter();

  if (!dashboardData) return null;

  const { stats } = dashboardData;

  const statCards: Array<{ value: string | number; label: string; icon: any; tab?: string }> = [
    { value: stats.totalLeads, label: 'Leads', icon: Users, tab: 'leads' },
    { value: stats.totalContacts, label: 'Contacts', icon: UserCheck, tab: 'contacts' },
    { value: stats.totalOpportunities, label: 'Opportunities', icon: Briefcase, tab: 'opportunities' },
    { value: stats.totalAccounts, label: 'Accounts', icon: Building2, tab: 'accounts' },
  ];

  if (stats.totalOpportunityValue !== undefined) {
    statCards.push({
      value: `$${stats.totalOpportunityValue.toLocaleString()}`,
      label: 'Total Opportunity Value',
      icon: TrendingUp,
    });
  }

  const quarterlyData = calculateQuarterlyPerformance;

  const handleCardClick = (tab?: string) => {
    if (tab) {
      onTabChange(tab as any);
      router.replace(`${ROUTES.CRM.SALESFORCE.DATA}?tab=${tab}`, undefined, { shallow: true });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div className={styles.dashboard_grid}>
        {statCards.map((card, index) => {
          const IconComponent = card.icon;
          const isHovered = hoveredCardIndex === index && card.tab && index < 4; // Only first 4 cards
          return (
            <div 
              key={index} 
              className={styles.stat_card}
              onClick={() => handleCardClick(card.tab)}
              style={{ 
                cursor: card.tab ? 'pointer' : 'default',
                transition: 'all 0.2s ease',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                if (card.tab) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                  if (index < 4) {
                    onHoveredCardIndexChange(index);
                  }
                }
              }}
              onMouseLeave={(e) => {
                if (card.tab) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '';
                  if (index < 4) {
                    onHoveredCardIndexChange(null);
                  }
                }
              }}
            >
              {isHovered && (
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                }}>
                  <ExternalLink size={16} color={carterColors['brand-600']} />
                </div>
              )}
              <div className={styles.stat_icon}>
                <IconComponent size={20} color={carterColors['text-600']} />
              </div>
              <Typography variant="h2-semibold" color={isHovered ? carterColors['brand-600'] : carterColors['text-900']}>
                {card.value}
              </Typography>
              <Typography variant="body-regular" color={carterColors['text-600']}>
                {card.label}
              </Typography>
            </div>
          );
        })}
      </div>

      {/* Quarterly Performance Section */}
      {quarterlyData && (
        <div style={{
          padding: '24px',
          border: `1px solid ${carterColors['grey-200']}`,
          borderRadius: '8px',
          backgroundColor: 'white',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
            <Typography variant="h2-semibold" color={carterColors['text-900']}>
              Performance
            </Typography>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {dateFilter !== DATE_FILTER_ENUM.CUSTOM ? (
                <Button
                  label="Custom"
                  size="small"
                  variant="text-only"
                  onClick={() => {
                    onDateFilterChange(DATE_FILTER_ENUM.CUSTOM);
                  }}
                />
              ) : (
                <CarterDateRangePicker
                  value={{ startDate: dateRange.startDate || undefined, endDate: dateRange.endDate || undefined }}
                  withTimezone
                  timeZone={timeZone}
                  calendarProps={{
                    startDatePicker: {
                      views: ['year', 'day'] as any,
                      format: DATE_FORMAT.MM_DD_YYYY,
                      label: 'Start Date',
                      maxDateTime: dateRange.endDate || undefined,
                      minDateTime: account?.createdAt ? DateTimeParser(account.createdAt) : undefined,
                    },
                    endDatePicker: {
                      views: ['year', 'day'] as any,
                      format: DATE_FORMAT.MM_DD_YYYY,
                      label: 'End Date',
                      disablePast: false,
                      minDateTime: dateRange.startDate || undefined,
                      maxDateTime: DateTimeParser.tz(timeZone),
                    },
                  }}
                  onChange={({ startDate, endDate }: Record<'startDate' | 'endDate', DateTimeType>) => {
                    if (!isDateRangeAllowed({ startDate, endDate })) {
                      showAlert({
                        title: 'Please note that the maximum allowed date difference is one year',
                        variant: 'danger',
                      });
                      return;
                    }
                    onDateRangeChange({
                      startDate: DateTimeParser.tz(startDate, timeZone).startOf('day'),
                      endDate: DateTimeParser.tz(endDate, timeZone).endOf('day'),
                    });
                    // Keep in Custom mode when user manually changes dates
                    if (dateFilter !== DATE_FILTER_ENUM.CUSTOM) {
                      onDateFilterChange(DATE_FILTER_ENUM.CUSTOM);
                    }
                  }}
                />
              )}
              <ButtonGroup
                buttons={[
                  { label: DATE_FILTER_ENUM.LAST_30_DAYS },
                  { label: DATE_FILTER_ENUM.LAST_90_DAYS },
                ]}
                initialActive={dateFilter}
                onClick={onDateFilterChange}
              />
            </div>
          </div>

          {/* Summary Metrics */}
          <div style={{ 
            display: 'flex', 
            gap: '24px',
            marginBottom: '24px',
            flexWrap: 'wrap'
          }}>
            <div>
              <div style={{ marginBottom: '4px' }}>
                <Typography variant="caption-regular" color={carterColors['text-600']}>
                  CLOSED
                </Typography>
              </div>
              <Typography variant="h3-semibold" color={carterColors['text-900']}>
                ${quarterlyData.totalClosed.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </Typography>
            </div>
            <div>
              <div style={{ marginBottom: '4px' }}>
                <Typography variant="caption-regular" color={carterColors['text-600']}>
                  OPEN (&gt;70%)
                </Typography>
              </div>
              <Typography variant="h3-semibold" color={carterColors['text-900']}>
                ${quarterlyData.totalOpenHighProb.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </Typography>
            </div>
            <div>
              <div style={{ marginBottom: '4px' }}>
                <Typography variant="caption-regular" color={carterColors['text-600']}>
                  GOAL
                </Typography>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isEditingGoal ? (
                  <input
                    type="number"
                    value={goalInputValue}
                    onChange={(e) => onGoalInputChange(e.target.value)}
                    onBlur={() => {
                      const numValue = parseFloat(goalInputValue);
                      if (!isNaN(numValue) && numValue >= 0) {
                        onGoalValueChange(numValue);
                      } else if (goalInputValue === '' || goalInputValue === '--') {
                        onGoalValueChange(null);
                      }
                      onEditingGoalChange(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const numValue = parseFloat(goalInputValue);
                        if (!isNaN(numValue) && numValue >= 0) {
                          onGoalValueChange(numValue);
                        } else if (goalInputValue === '' || goalInputValue === '--') {
                          onGoalValueChange(null);
                        }
                        onEditingGoalChange(false);
                      } else if (e.key === 'Escape') {
                        onGoalInputChange(goalValue !== null ? goalValue.toString() : '');
                        onEditingGoalChange(false);
                      }
                    }}
                    autoFocus
                    style={{
                      width: '120px',
                      padding: '4px 8px',
                      border: `1px solid ${carterColors['grey-300']}`,
                      borderRadius: '4px',
                      fontSize: '18px',
                      fontWeight: 600,
                      color: carterColors['text-900'],
                    }}
                  />
                ) : (
                  <>
                    <Typography variant="h3-semibold" color={carterColors['text-900']}>
                      {goalValue !== null && goalValue > 0
                        ? `$${goalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                        : '-----'}
                    </Typography>
                    <Button
                      variant="tertiary"
                      size="small"
                      icon={<Pencil size={14} />}
                      onClick={() => {
                        onGoalInputChange(goalValue !== null ? goalValue.toString() : '');
                        onEditingGoalChange(true);
                      }}
                      title="Edit Goal"
                    />
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Performance Line Chart */}
          <div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart 
                data={quarterlyData.monthlyData} 
                margin={{ top: 60, right: 30, left: 20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={carterColors['grey-200']} />
                <XAxis 
                  dataKey="month" 
                  tick={{ fill: carterColors['text-600'], fontSize: 12 }}
                />
                <YAxis 
                  tick={{ fill: carterColors['text-600'], fontSize: 12 }}
                  tickFormatter={(value) => {
                    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
                    return value.toString();
                  }}
                  domain={[0, 'dataMax + 200']}
                />
                <RechartsTooltip
                  formatter={(value: number) => `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: `1px solid ${carterColors['grey-200']}`,
                    borderRadius: '4px',
                  }}
                />
                <Legend 
                  iconType="square"
                  align="right"
                  verticalAlign="top"
                  wrapperStyle={{ paddingTop: '0px', paddingBottom: '20px' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="closed" 
                  stroke={carterColors['green-700']} 
                  strokeWidth={2}
                  name="Closed"
                  dot={{ fill: 'transparent', stroke: carterColors['green-700'], strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: carterColors['green-700'] }}
                />
                <Line 
                  type="monotone" 
                  dataKey="closedPlusOpen" 
                  stroke={carterColors['blue-700']} 
                  strokeWidth={2}
                  name="Closed + Open (>70%)"
                  dot={{ fill: 'transparent', stroke: carterColors['blue-700'], strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: carterColors['blue-700'] }}
                />
                {goalValue !== null && goalValue > 0 && (
                  <Line 
                    type="monotone" 
                    dataKey="goal" 
                    stroke={carterColors['orange-700']} 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="Goal"
                    dot={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Recent Records and Key Deals Section */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '24px',
      }}>
        {/* Recent Records Card */}
        <div style={{
          padding: '24px',
          border: `1px solid ${carterColors['grey-200']}`,
          borderRadius: '8px',
          backgroundColor: 'white',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}>
          <div style={{ marginBottom: '16px' }}>
            <Typography variant="h2-semibold" color={carterColors['text-900']}>
              Recent Records
            </Typography>
            <Typography variant="body-regular" color={carterColors['text-500']}>
              <span style={{ marginTop: '4px', fontSize: '13px', display: 'block' }}>Latest leads, contacts, opportunities and accounts</span>
            </Typography>
          </div>

          {dashboardData?.contacts?.records?.length === 0
            && dashboardData?.opportunities?.records?.length === 0
            && (dashboardData?.leads?.records?.length ?? 0) > 0 && (
            <Typography variant="caption-regular" color={carterColors['text-500']}>
              <span style={{ marginBottom: '12px', fontStyle: 'italic', display: 'block' }}>
                Add contacts and opportunities in Salesforce to see a list of recent records here.
              </span>
            </Typography>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
            {(() => {
              const allRecords: Array<{
                type: string;
                typeLabel: string;
                id: string;
                name: string;
                icon: any;
                bgColor: string;
                onClick: () => void;
                lastModified: Date;
              }> = [];

              dashboardData?.leads?.records?.forEach((lead: any) => {
                const name = lead.FirstName && lead.LastName ? `${lead.FirstName} ${lead.LastName}`.trim() : lead.Name || 'Unnamed Lead';
                allRecords.push({
                  type: 'lead',
                  typeLabel: 'Lead',
                  id: lead.Id,
                  name,
                  icon: User,
                  bgColor: (carterColors as Record<string, string>)['green-100'] ?? carterColors['green-700'],
                  onClick: () => router.push(`/crm/leads/${lead.Id}`),
                  lastModified: new Date(lead.LastModifiedDate || lead.CreatedDate || 0),
                });
              });

              dashboardData?.contacts?.records?.forEach((contact: any) => {
                const name = contact.FirstName && contact.LastName ? `${contact.FirstName} ${contact.LastName}`.trim() : contact.Name || 'Unnamed Contact';
                allRecords.push({
                  type: 'contact',
                  typeLabel: 'Contact',
                  id: contact.Id,
                  name,
                  icon: UserCheck,
                  bgColor: (carterColors as Record<string, string>)['brand-50'] ?? carterColors['brand-500'],
                  onClick: () => router.push(`/crm/contacts/${contact.Id}`),
                  lastModified: new Date(contact.LastModifiedDate || contact.CreatedDate || 0),
                });
              });

              dashboardData?.opportunities?.records?.forEach((opp: any) => {
                allRecords.push({
                  type: 'opportunity',
                  typeLabel: 'Opportunity',
                  id: opp.Id,
                  name: opp.Name || 'Unnamed Opportunity',
                  icon: Briefcase,
                  bgColor: (carterColors as Record<string, string>)['orange-100'] ?? carterColors['orange-700'],
                  onClick: () => router.push(`/crm/opportunities/${opp.Id}`),
                  lastModified: new Date(opp.LastModifiedDate || opp.CreatedDate || 0),
                });
              });

              // Top 5: ensure mix of lead, contact, opportunity (at least one of each type if available)
              const byType = { lead: [] as typeof allRecords, contact: [] as typeof allRecords, opportunity: [] as typeof allRecords };
              allRecords.forEach((r) => {
                if (r.type === 'lead') byType.lead.push(r);
                else if (r.type === 'contact') byType.contact.push(r);
                else if (r.type === 'opportunity') byType.opportunity.push(r);
              });
              const sortByDate = (a: typeof allRecords[0], b: typeof allRecords[0]) => b.lastModified.getTime() - a.lastModified.getTime();
              byType.lead.sort(sortByDate);
              byType.contact.sort(sortByDate);
              byType.opportunity.sort(sortByDate);

              const pickedIds = new Set<string>();
              const mixed: typeof allRecords = [];
              // Take most recent from each type first (so we have at least one lead, one contact, one opportunity)
              if (byType.lead.length) { mixed.push(byType.lead[0]); pickedIds.add(byType.lead[0].id); }
              if (byType.contact.length) { mixed.push(byType.contact[0]); pickedIds.add(byType.contact[0].id); }
              if (byType.opportunity.length) { mixed.push(byType.opportunity[0]); pickedIds.add(byType.opportunity[0].id); }
              // Fill remaining slots (up to 5) with next most recent from combined list
              const rest = allRecords.filter((r) => !pickedIds.has(r.id)).sort(sortByDate);
              for (let i = 0; mixed.length < 5 && i < rest.length; i++) {
                mixed.push(rest[i]);
              }
              const recentRecords = mixed.sort(sortByDate).slice(0, 5);

              if (recentRecords.length === 0) {
                return (
                  <div style={{
                    padding: '32px 16px',
                    textAlign: 'center',
                    backgroundColor: (carterColors as Record<string, string>)['grey-50'] ?? carterColors['grey-200'],
                    borderRadius: '8px',
                  }}>
                    <Typography variant="body-regular" color={carterColors['text-600']}>
                      No recent records yet. Connect Salesforce and add data to see activity here.
                    </Typography>
                  </div>
                );
              }

              const formatRelative = (d: Date) => {
                const now = new Date();
                const diffMs = now.getTime() - d.getTime();
                const diffMins = Math.floor(diffMs / 60000);
                const diffHours = Math.floor(diffMs / 3600000);
                const diffDays = Math.floor(diffMs / 86400000);
                if (diffMins < 60) return `${diffMins}m ago`;
                if (diffHours < 24) return `${diffHours}h ago`;
                if (diffDays < 7) return `${diffDays}d ago`;
                return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              };

              return recentRecords.map((record) => (
                <div
                  key={`${record.type}-${record.id}`}
                  onClick={record.onClick}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 14px',
                    borderRadius: '6px',
                    cursor: record.type === 'account' ? 'default' : 'pointer',
                    transition: 'background-color 0.2s ease',
                    backgroundColor: 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (record.type !== 'account') {
                      const greyBg = (carterColors as Record<string, string>)['grey-50'] ?? carterColors['grey-200'];
                      e.currentTarget.style.backgroundColor = greyBg;
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'nowrap' }}>
                    <Typography variant="body-regular" color={carterColors['brand-600']}>
                      <span style={{ fontWeight: 500, flexShrink: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {record.name}
                      </span>
                    </Typography>
                    <span style={{
                      fontSize: '11px',
                      color: carterColors['text-500'],
                      flexShrink: 0,
                      textTransform: 'capitalize',
                    }}>
                      {record.typeLabel}
                    </span>
                  </div>
                  <Typography variant="body-regular" color={carterColors['text-500']}>
                    <span style={{ fontSize: '13px', flexShrink: 0 }}>{formatRelative(record.lastModified)}</span>
                  </Typography>
                  {record.type !== 'account' && (
                    <ChevronRight size={16} color={carterColors['text-400']} style={{ flexShrink: 0 }} />
                  )}
                </div>
              ));
            })()}
          </div>

          <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: `1px solid ${carterColors['grey-200']}` }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                padding: '8px 0',
              }}
              onMouseEnter={(e) => {
                const t = e.currentTarget.querySelector('[data-view-all]');
                if (t) (t as HTMLElement).style.textDecoration = 'underline';
              }}
              onMouseLeave={(e) => {
                const t = e.currentTarget.querySelector('[data-view-all]');
                if (t) (t as HTMLElement).style.textDecoration = 'none';
              }}
              onClick={() => {
                onTabChange('leads');
                router.replace(`${ROUTES.CRM.SALESFORCE.DATA}?tab=leads`, undefined, { shallow: true });
              }}
            >
              <Typography variant="body-regular" color={carterColors['brand-600']} data-view-all>
                View All
              </Typography>
              <ChevronRight size={16} color={carterColors['brand-600']} />
            </div>
          </div>
        </div>

        {/* Key Deals Card - simple list */}
        {dashboardData?.opportunities?.records && dashboardData.opportunities.records.length > 0 && (
          <div style={{
            padding: '24px',
            border: `1px solid ${carterColors['grey-200']}`,
            borderRadius: '8px',
            backgroundColor: 'white',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
          }}>
            <div style={{ marginBottom: '16px' }}>
              <Typography variant="h2-semibold" color={carterColors['text-900']}>
                Key Deals
              </Typography>
              <Typography variant="body-regular" color={carterColors['text-500']}>
                <span style={{ marginTop: '4px', fontSize: '13px', display: 'block' }}>Top opportunities by value</span>
              </Typography>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
              {dashboardData.opportunities.records
                .sort((a: any, b: any) => (Number(b.Amount) || 0) - (Number(a.Amount) || 0))
                .slice(0, 5)
                .map((opportunity: any) => {
                  const formatCurrency = (value: any): string => {
                    if (value === null || value === undefined) return '-';
                    const num = Number(value);
                    if (isNaN(num)) return '-';
                    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);
                  };
                  const formatDate = (value: any): string => {
                    if (!value) return '-';
                    try {
                      return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                    } catch {
                      return String(value);
                    }
                  };
                  return (
                    <div
                      key={opportunity.Id}
                      onClick={() => router.push(`/crm/opportunities/${opportunity.Id}`)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 14px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = (carterColors as Record<string, string>)['grey-50'] ?? carterColors['grey-200'];
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body-regular" color={carterColors['brand-600']}>
                          <span style={{ fontWeight: 500 }}>{opportunity.Name || '-'}</span>
                        </Typography>
                      </div>
                      <Typography variant="body-regular" color={carterColors['text-500']}>
                        <span style={{ fontSize: '13px', flexShrink: 0 }}>{formatDate(opportunity.CloseDate)}</span>
                      </Typography>
                      <Typography variant="body-semibold" color={carterColors['text-900']}>
                        <span style={{ fontSize: '13px', minWidth: '72px', textAlign: 'right', display: 'inline-block' }}>
                          {formatCurrency(opportunity.Amount)}
                        </span>
                      </Typography>
                      <ChevronRight size={16} color={carterColors['text-400']} style={{ flexShrink: 0 }} />
                    </div>
                  );
                })}
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: `1px solid ${carterColors['grey-200']}` }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  padding: '8px 0',
                }}
                onMouseEnter={(e) => {
                  const t = e.currentTarget.querySelector('[data-view-all]');
                  if (t) (t as HTMLElement).style.textDecoration = 'underline';
                }}
                onMouseLeave={(e) => {
                  const t = e.currentTarget.querySelector('[data-view-all]');
                  if (t) (t as HTMLElement).style.textDecoration = 'none';
                }}
                onClick={() => {
                  onTabChange('opportunities');
                  router.replace(`${ROUTES.CRM.SALESFORCE.DATA}?tab=opportunities`, undefined, { shallow: true });
                }}
              >
                <Typography variant="body-regular" color={carterColors['brand-600']} data-view-all>
                  View All Key Deals
                </Typography>
                <ChevronRight size={16} color={carterColors['brand-600']} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesforceDashboard;
