import React, { useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { Typography, carterColors, Button, Chip } from 'shyftlabs-dsl';
import { Bell, Check, Trash2, User, Briefcase, FileText, MessageSquare } from 'lucide-react';
import { Skeleton } from '@/lib/material-ui';
import SalesforceService from '@/services/crm/salesforce/salesforce.service';
import { Notification } from '@/services/notifications/notification.service';
import { NotificationsProps } from '../types';

const getObjectIcon = (objectType: string) => {
  switch (objectType) {
    case 'lead':
    case 'contact':
      return <User size={16} color={carterColors['brand-600']} />;
    case 'opportunity':
      return <Briefcase size={16} color={carterColors['brand-600']} />;
    case 'ticket':
      return <FileText size={16} color={carterColors['brand-600']} />;
    default:
      return <MessageSquare size={16} color={carterColors['text-600']} />;
  }
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

// Component to fetch and display object name
const ObjectNameLink: React.FC<{
  objectType: string;
  objectId: string;
  beforeText: string;
}> = ({ objectType, objectId, beforeText }) => {
  const router = useRouter();
  const salesforceService = useMemo(() => new SalesforceService(), []);

  // Fetch object data to get the name
  const { data: objectData, isLoading } = useSWR(
    objectId && ['lead', 'contact', 'opportunity'].includes(objectType)
      ? [`object-name-${objectType}-${objectId}`, objectType, objectId]
      : null,
    async () => {
      try {
        switch (objectType) {
          case 'lead':
            return await salesforceService.getLead(objectId, false);
          case 'contact':
            return await salesforceService.getContact(objectId, false);
          case 'opportunity':
            return await salesforceService.getOpportunity(objectId, false);
          default:
            return null;
        }
      } catch (error) {
        console.error(`Error fetching ${objectType}:`, error);
        return null;
      }
    },
    { revalidateOnFocus: false }
  );

  // Extract object name based on type
  const getObjectName = () => {
    if (!objectData) return null;
    
    switch (objectType) {
      case 'lead':
        const firstName = objectData.FirstName || '';
        const lastName = objectData.LastName || '';
        return `${firstName} ${lastName}`.trim() || objectData.Name || objectData.Company || 'Lead';
      case 'contact':
        const contactFirstName = objectData.FirstName || '';
        const contactLastName = objectData.LastName || '';
        return `${contactFirstName} ${contactLastName}`.trim() || objectData.Name || 'Contact';
      case 'opportunity':
        return objectData.Name || 'Opportunity';
      default:
        return null;
    }
  };

  const objectName = getObjectName();
  const routeMap: { [key: string]: string } = {
    'lead': '/crm/leads',
    'contact': '/crm/contacts',
    'opportunity': '/crm/opportunities',
    'ticket': '/crm/tickets/kanban',
  };

  const handleObjectClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (objectType === 'ticket') {
      // For tickets, navigate to kanban with ticketId to open the drawer
      router.push(`${routeMap[objectType]}?ticketId=${objectId}`);
    } else {
      router.push(`${routeMap[objectType]}/${objectId}`);
    }
  };

  const objectTypeDisplay = objectType.charAt(0).toUpperCase() + objectType.slice(1);

  if (isLoading) {
    return (
      <span>
        {beforeText}
        {objectTypeDisplay} - <span style={{ color: carterColors['text-400'] }}>Loading...</span>
      </span>
    );
  }

  if (!objectName) {
    return (
      <span>
        {beforeText}
        <span
          onClick={handleObjectClick}
          style={{
            color: carterColors['brand-600'],
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          {objectTypeDisplay}
        </span>
      </span>
    );
  }

  return (
    <span>
      {beforeText}
      {objectTypeDisplay} -{' '}
      <span
        onClick={handleObjectClick}
        style={{
          color: carterColors['brand-600'],
          cursor: 'pointer',
          textDecoration: 'underline',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = carterColors['brand-700'];
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = carterColors['brand-600'];
        }}
      >
        {objectName}
      </span>
    </span>
  );
};

const SalesforceNotifications: React.FC<NotificationsProps> = ({
  notifications,
  unreadCount,
  isLoadingNotifications,
  markingAsRead,
  onNotificationClick,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
}) => {
  const router = useRouter();

  const renderMessageWithClickableKeywords = useCallback(
    (message: string, notification: Notification) => {
      if (!notification.related_entity) {
        return <span>{message}</span>;
      }

      const objectType = notification.related_entity.object_type;
      const objectId = notification.related_entity.object_id;
      
      // Map object types to their route paths
      const routeMap: { [key: string]: string } = {
        'lead': '/crm/leads',
        'contact': '/crm/contacts',
        'opportunity': '/crm/opportunities',
        'ticket': '/crm/tickets/kanban',
      };

      // Find the pattern "on {object_type}: {comment_content}" and replace with object name
      const objectPattern = new RegExp(`(${objectType}):\\s*.+$`, 'i');
      const objectMatch = message.match(objectPattern);
      
      if (objectMatch && routeMap[objectType] && objectId) {
        const beforeObject = message.substring(0, objectMatch.index);
        
        // Use ObjectNameLink component to fetch and display the actual object name
        if (['lead', 'contact', 'opportunity'].includes(objectType)) {
          return (
            <ObjectNameLink
              objectType={objectType}
              objectId={objectId}
              beforeText={beforeObject}
            />
          );
        }
        
        // For tickets, navigate to kanban with ticketId to open the drawer
        const handleObjectClick = (e: React.MouseEvent) => {
          e.stopPropagation();
          router.push(`${routeMap[objectType]}?ticketId=${objectId}`);
        };

        return (
          <span>
            {beforeObject}
            <span
              onClick={handleObjectClick}
              style={{
                color: carterColors['brand-600'],
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              {objectType.charAt(0).toUpperCase() + objectType.slice(1)}
            </span>
          </span>
        );
      }

      // Fallback to original keyword highlighting for other notification types
      const keywords = ['comment', 'lead', 'opportunity', 'contact', 'ticket'];
      const keywordRegex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'gi');
      
      const parts: Array<{ text: string; isKeyword: boolean }> = [];
      let lastIndex = 0;
      let match;

      while ((match = keywordRegex.exec(message)) !== null) {
        if (match.index > lastIndex) {
          parts.push({
            text: message.substring(lastIndex, match.index),
            isKeyword: false,
          });
        }
        
        parts.push({
          text: match[0],
          isKeyword: true,
        });
        
        lastIndex = keywordRegex.lastIndex;
      }
      
      if (lastIndex < message.length) {
        parts.push({
          text: message.substring(lastIndex),
          isKeyword: false,
        });
      }

      return (
        <span>
          {parts.map((part, index) => {
            if (part.isKeyword) {
              const isComment = part.text.toLowerCase() === 'comment';
              return (
                <span
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    onNotificationClick(notification);
                  }}
                  style={{
                    color: carterColors['brand-600'],
                    cursor: 'pointer',
                    textDecoration: isComment ? 'none' : 'underline',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = carterColors['brand-700'];
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = carterColors['brand-600'];
                  }}
                >
                  {part.text}
                </span>
              );
            }
            return <span key={index}>{part.text}</span>;
          })}
        </span>
      );
    },
    [onNotificationClick, router]
  );

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Bell size={24} color={carterColors['brand-600']} />
          <Typography variant="h2-semibold" color={carterColors['text-900']}>
            Notifications
          </Typography>
          {unreadCount > 0 && (
            <Chip
              label={unreadCount}
              style={{
                backgroundColor: carterColors['red-700'],
                color: 'white',
                fontSize: '12px',
                height: '20px',
                minWidth: '20px',
              }}
            />
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="tertiary"
            size="small"
            label="Mark all read"
            icon={<Check size={14} />}
            onClick={onMarkAllAsRead}
          />
        )}
      </div>

      {isLoadingNotifications ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3, 4, 5].map((index) => (
            <div
              key={index}
              style={{
                padding: '16px',
                border: `1px solid ${carterColors['grey-200']}`,
                borderRadius: '8px',
                backgroundColor: 'white',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '16px',
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Skeleton width={16} height={16} variant="circular" />
                  <Skeleton width={120} height={20} variant="text" />
                  <Skeleton width={8} height={8} variant="circular" />
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <Skeleton width="90%" height={16} variant="text" style={{ marginBottom: '4px' }} />
                  <Skeleton width="70%" height={16} variant="text" />
                </div>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <Skeleton width={80} height={14} variant="text" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Skeleton width={32} height={32} variant="rectangular" style={{ borderRadius: '4px' }} />
                <Skeleton width={32} height={32} variant="rectangular" style={{ borderRadius: '4px' }} />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px' }}>
          <Bell size={48} color={carterColors['text-400']} />
          <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center' }}>
            <Typography variant="body-regular" color={carterColors['text-600']}>
              No notifications
            </Typography>
          </div>
          <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'center' }}>
            <Typography variant="caption-regular" color={carterColors['text-500']}>
              You'll be notified when someone mentions you in a comment
            </Typography>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {notifications.map((notification) => (
            <div
              key={notification.id}
              style={{
                padding: '16px',
                border: `1px solid ${carterColors['grey-200']}`,
                borderRadius: '8px',
                backgroundColor: notification.is_read ? 'white' : carterColors['grey-200'],
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '16px',
              }}
              onClick={() => onNotificationClick(notification)}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  {notification.related_entity && getObjectIcon(notification.related_entity.object_type)}
                  <Typography variant="body-semibold" color={carterColors['text-900']}>
                    {notification.title}
                  </Typography>
                  {!notification.is_read && (
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: carterColors['brand-600'],
                      }}
                    />
                  )}
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <Typography variant="body-regular" color={carterColors['text-600']}>
                    {renderMessageWithClickableKeywords(notification.message, notification)}
                  </Typography>
                </div>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <Typography variant="caption-regular" color={carterColors['text-400']}>
                    {formatDate(notification.created_at)}
                  </Typography>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {!notification.is_read && (
                  <Button
                    variant="tertiary"
                    size="small"
                    icon={<Check size={14} />}
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkAsRead(notification.id);
                    }}
                    disabled={markingAsRead === notification.id}
                    title="Mark as read"
                  />
                )}
                <Button
                  variant="tertiary"
                  size="small"
                  icon={<Trash2 size={14} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(notification.id);
                  }}
                  title="Delete"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SalesforceNotifications;
