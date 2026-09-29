import React, { useState, useMemo, useEffect } from 'react';
import { Typography, carterColors, Button } from 'shyftlabs-dsl';
import { MessageSquare, RefreshCw, User, ArrowRight } from 'lucide-react';
import useSWR from 'swr';
import SalesforceService from '@/services/crm/salesforce/salesforce.service';
import { showAlert } from '@/redux/actions';
import styles from '../styles/crm.module.scss';

interface CRMChatterFeedProps {
  recordId: string; // Salesforce ID
  onRefresh?: () => void;
  refreshTrigger?: number; // Trigger refresh when this value changes
}

const CRMChatterFeed: React.FC<CRMChatterFeedProps> = ({
  recordId,
  onRefresh,
  refreshTrigger,
}) => {
  const salesforceService = useMemo(() => new SalesforceService(), []);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch Chatter feed
  const { data: chatterData, mutate, isLoading, error } = useSWR(
    recordId ? [`chatter-feed-${recordId}`, recordId, refreshTrigger] : null,
    () => salesforceService.getChatterFeed(recordId, 25, 0),
    {
      revalidateOnFocus: false,
    }
  );

  // Refresh when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      mutate();
    }
  }, [refreshTrigger, mutate]);

  // Handle both "items" and "elements" from the API response
  const rawFeedItems = chatterData?.items || chatterData?.elements || [];
  const chatterError = chatterData?.error;

  // Flatten bundles to show each individual update
  const flattenFeedItems = (items: any[]): any[] => {
    const flattened: any[] = [];
    items.forEach((item) => {
      // Check both 'type' and 'feedElementType' for Bundle identification
      const isBundle = item.type === 'Bundle' || item.feedElementType === 'Bundle';
      
      if (isBundle && item.capabilities?.bundle?.page?.elements) {
        // Expand bundle: add each nested element as a separate item
        const bundleElements = item.capabilities.bundle.page.elements;
        console.debug(`Flattening bundle ${item.id} with ${bundleElements.length} elements`);
        
        bundleElements.forEach((element: any) => {
          // Preserve all element data and add bundle metadata
          const flattenedElement = {
            ...element,
            _isFromBundle: true,
            _bundleId: item.id,
            _bundleHeader: item.header?.text || 'Record updated',
            // Ensure we have the createdDate from the element
            createdDate: element.createdDate || item.createdDate,
            relativeCreatedDate: element.relativeCreatedDate || item.relativeCreatedDate,
            // Preserve the type/feedElementType from the element
            type: element.type || element.feedElementType || 'TrackedChange',
            feedElementType: element.feedElementType || element.type || 'FeedItem',
          };
          flattened.push(flattenedElement);
        });
      } else if (isBundle && item.capabilities?.bundle?.changes) {
        // Handle bundles that have changes directly (without page.elements)
        const changes = item.capabilities.bundle.changes || [];
        changes.forEach((change: any, idx: number) => {
          const flattenedElement = {
            id: `${item.id}-change-${idx}`,
            type: 'TrackedChange',
            feedElementType: 'FeedItem',
            _isFromBundle: true,
            _bundleId: item.id,
            _bundleHeader: item.header?.text || 'Record updated',
            createdDate: item.createdDate,
            relativeCreatedDate: item.relativeCreatedDate,
            capabilities: {
              trackedChanges: {
                changes: [change]
              }
            },
            header: {
              text: `${change.fieldName} changed from ${change.oldValue} to ${change.newValue}`
            },
            actor: item.actor || item.createdBy,
          };
          flattened.push(flattenedElement);
        });
      } else {
        // Regular item, add as-is
        flattened.push(item);
      }
    });
    // Sort by createdDate descending (newest first)
    return flattened.sort((a, b) => {
      const dateA = a.createdDate ? new Date(a.createdDate).getTime() : 0;
      const dateB = b.createdDate ? new Date(b.createdDate).getTime() : 0;
      return dateB - dateA;
    });
  };

  const feedItems = flattenFeedItems(rawFeedItems);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await mutate();
      onRefresh?.();
      showAlert({
        variant: 'success',
        title: 'Chatter feed refreshed',
      });
    } catch (error: any) {
      showAlert({
        variant: 'warning' as any,
        title: error?.message || 'Failed to refresh Chatter feed',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('en-US', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return dateString;
    }
  };

  const getFeedItemContent = (item: any) => {
    // Handle Connect API format (feed-elements)
    if (item.body) {
      if (item.body.text) {
        return item.body.text.trim();
      }
      if (item.body.messageSegments && Array.isArray(item.body.messageSegments)) {
        // Filter out markup segments and get text
        const textSegments = item.body.messageSegments
          .filter((seg: any) => seg.type === 'Text' && seg.text)
          .map((seg: any) => seg.text);
        return textSegments.join('').trim();
      }
    }
    // Fallback for other formats
    if (item.messageBody) {
      return item.messageBody.text || item.messageBody.messageSegments?.map((seg: any) => seg.text || '').join('') || '';
    }
    return '';
  };

  const getFeedItemAuthor = (item: any) => {
    // Connect API format - check actor first
    if (item.actor?.name) return item.actor.name;
    if (item.actor?.displayName) return item.actor.displayName;
    // For bundle elements, check parent actor
    if (item._isFromBundle && item.actor) {
      if (item.actor.name) return item.actor.name;
      if (item.actor.displayName) return item.actor.displayName;
    }
    // Fallback formats
    if (item.createdBy?.name) return item.createdBy.name;
    if (item.user?.name) return item.user.name;
    // Last resort: try to extract from header messageSegments
    if (item.header?.messageSegments) {
      const entityLink = item.header.messageSegments.find((seg: any) => seg.type === 'EntityLink' && seg.reference?.id?.startsWith('005'));
      if (entityLink?.text) return entityLink.text;
    }
    return 'System';
  };

  const getAuthorPhoto = (item: any) => {
    if (item.actor?.photo?.smallPhotoUrl) return item.actor.photo.smallPhotoUrl;
    if (item.actor?.photoUrl) return item.actor.photoUrl;
    return null;
  };

  const getInitials = (name: string) => {
    if (!name || name === 'System') return 'S';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getFeedItemType = (item: any) => {
    const itemType = item.type || item.feedElementType;
    if (itemType === 'TextPost' || item.feedElementType === 'FeedItem') return 'Post';
    if (itemType === 'ContentPost') return 'File';
    if (itemType === 'LinkPost') return 'Link';
    if (itemType === 'TrackedChange') return 'Field Change';
    const isBundle = item.type === 'Bundle' || item.feedElementType === 'Bundle';
    if (isBundle && item.capabilities?.bundle?.bundleType === 'TrackedChanges') return 'Record Updates';
    return 'Update';
  };

  const getCommentCount = (item: any) => {
    // Connect API format
    if (item.capabilities?.comments?.page?.total !== undefined) {
      return item.capabilities.comments.page.total;
    }
    if (item.commentCount !== undefined) return item.commentCount;
    return 0;
  };

  const getLikeCount = (item: any) => {
    // Connect API format
    if (item.capabilities?.chatterLikes?.page?.total !== undefined) {
      return item.capabilities.chatterLikes.page.total;
    }
    if (item.likeCount !== undefined) return item.likeCount;
    return 0;
  };

  const getHeaderText = (item: any) => {
    // Use header.text if available (formatted display text)
    if (item.header?.text) {
      return item.header.text;
    }
    // Fallback to constructing from messageSegments
    if (item.header?.messageSegments) {
      return item.header.messageSegments
        .filter((seg: any) => seg.text)
        .map((seg: any) => seg.text)
        .join('');
    }
    return null;
  };

  const getFieldChanges = (item: any) => {
    // For TrackedChange items - check both type and feedElementType
    const isTrackedChange = item.type === 'TrackedChange' || item.feedElementType === 'TrackedChange';
    
    if (isTrackedChange) {
      if (item.capabilities?.trackedChanges?.changes) {
        return item.capabilities.trackedChanges.changes;
      }
      // Sometimes changes are at the root level
      if (item.trackedChanges?.changes) {
        return item.trackedChanges.changes;
      }
    }
    // For Bundle items with TrackedChanges
    const isBundle = item.type === 'Bundle' || item.feedElementType === 'Bundle';
    if (isBundle && item.capabilities?.bundle?.changes) {
      return item.capabilities.bundle.changes;
    }
    return [];
  };

  const renderFeedItem = (item: any, index: number) => {
    const headerText = getHeaderText(item);
    const content = getFeedItemContent(item);
    const fieldChanges = getFieldChanges(item);
    const isTrackedChange = item.type === 'TrackedChange' || item.feedElementType === 'TrackedChange';
    const isFromBundle = item._isFromBundle;
    const author = getFeedItemAuthor(item);
    const authorPhoto = getAuthorPhoto(item);
    const isSystem = author === 'System';

    return (
      <div 
        key={item.id || index} 
        className={styles.chatter_feed_item}
        style={{ 
          marginLeft: isFromBundle ? '16px' : '0',
          borderLeft: isFromBundle ? `3px solid ${carterColors['grey-300']}` : 'none',
          paddingLeft: isFromBundle ? '12px' : '0',
        }}
      >
        <div className={styles.chatter_feed_item_header}>
          <div className={styles.chatter_feed_author}>
            <div style={{ position: 'relative' }}>
              {authorPhoto ? (
                <>
                  <img
                    src={authorPhoto}
                    alt={author}
                    className={styles.chatter_feed_avatar}
                    onError={(e) => {
                      // Fallback to initials if image fails to load
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const fallback = target.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                  <div 
                    className={`${styles.chatter_feed_avatar_fallback} ${isSystem ? styles.system : ''}`}
                    style={{ display: 'none', position: 'absolute', top: 0, left: 0 }}
                  >
                    {isSystem ? (
                      <User size={16} color={carterColors['text-400']} />
                    ) : (
                      <span>{getInitials(author)}</span>
                    )}
                  </div>
                </>
              ) : (
                <div 
                  className={`${styles.chatter_feed_avatar_fallback} ${isSystem ? styles.system : ''}`}
                >
                  {isSystem ? (
                    <User size={16} color={carterColors['text-400']} />
                  ) : (
                    <span>{getInitials(author)}</span>
                  )}
                </div>
              )}
            </div>
            <div className={styles.chatter_feed_author_info}>
              <Typography variant="body-semibold" color={carterColors['text-900']}>
                {author}
              </Typography>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Typography variant="caption-regular" color={carterColors['text-400']}>
                  {item.relativeCreatedDate || (item.createdDate ? formatDate(item.createdDate) : 'Unknown date')}
                </Typography>
                {item.visibility && (
                  <>
                    <span style={{ color: carterColors['text-300'] }}>•</span>
                    <Typography variant="caption-regular" color={carterColors['text-400']}>
                      {item.visibility === 'InternalUsers' ? 'Internal' : item.visibility}
                    </Typography>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className={styles.chatter_feed_type_badge}>
            <Typography variant="caption-regular" color={carterColors['text-500']}>
              {getFeedItemType(item)}
            </Typography>
          </div>
        </div>

        <div className={styles.chatter_feed_content}>
          {/* Display header text for field changes (shows the full change description) */}
          {headerText && (
            <div style={{ 
              marginBottom: fieldChanges.length > 0 ? '12px' : '0',
              lineHeight: '1.5'
            }}>
              <Typography variant="body-regular" color={carterColors['text-700']}>
                {headerText}
              </Typography>
            </div>
          )}

          {/* Display field changes individually */}
          {fieldChanges.length > 0 && (
            <div className={styles.chatter_feed_changes}>
              {fieldChanges.map((change: any, idx: number) => (
                <div key={idx} className={styles.chatter_feed_change_item}>
                  <div className={styles.chatter_feed_change_field}>
                    <Typography variant="body-semibold" color={carterColors['text-900']}>
                      {change.fieldName}
                    </Typography>
                  </div>
                  <div className={styles.chatter_feed_change_values}>
                    <span className={styles.chatter_feed_change_old}>{change.oldValue}</span>
                    <ArrowRight size={14} color={carterColors['text-400']} style={{ flexShrink: 0 }} />
                    <span className={styles.chatter_feed_change_new}>{change.newValue}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Display content for text posts */}
          {content && !isTrackedChange && (
            <div style={{ lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
              <Typography variant="body-regular" color={carterColors['text-700']}>
                {content}
              </Typography>
            </div>
          )}

          {/* If no content, header, or field changes, show a fallback */}
          {!headerText && !content && fieldChanges.length === 0 && (
            <div style={{ fontStyle: 'italic' }}>
              <Typography variant="body-regular" color={carterColors['text-500']}>
                {isTrackedChange ? 'Field change update' : 'No content available'}
              </Typography>
            </div>
          )}
        </div>

        {(getLikeCount(item) > 0 || getCommentCount(item) > 0) && (
          <div className={styles.chatter_feed_actions}>
            {getLikeCount(item) > 0 && (
              <Typography variant="caption-regular" color={carterColors['text-500']}>
                {getLikeCount(item)} {getLikeCount(item) === 1 ? 'like' : 'likes'}
              </Typography>
            )}
            {getCommentCount(item) > 0 && (
              <Typography variant="caption-regular" color={carterColors['text-500']}>
                {getCommentCount(item)} {getCommentCount(item) === 1 ? 'comment' : 'comments'}
              </Typography>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.comments_container}>
      <div className={styles.comments_header} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body-large-semibold" color={carterColors['text-900']}>
          Chatter Feed ({feedItems.length})
        </Typography>
        <Button
          variant="secondary"
          size="small"
          label="Refresh"
          icon={<RefreshCw size={16} />}
          onClick={handleRefresh}
          disabled={isRefreshing || isLoading}
        />
      </div>

      <div className={styles.comments_list}>
        {isLoading ? (
          <div className={styles.loading_state}>
            <Typography variant="body-regular" color={carterColors['text-600']}>
              Loading Chatter feed...
            </Typography>
          </div>
        ) : error ? (
          <div className={styles.empty_state}>
            <Typography variant="body-regular" color={carterColors['red-700']}>
              Failed to load Chatter feed. Please try again. {error?.message}
            </Typography>
          </div>
        ) : chatterError ? (
          <div className={styles.empty_state}>
            <MessageSquare size={24} color={carterColors['text-400']} style={{ marginBottom: '8px' }} />
            <Typography variant="body-regular" color={carterColors['text-500']}>
              {chatterError}
            </Typography>
            <div style={{ marginTop: '4px' }}>
              <Typography variant="caption-regular" color={carterColors['text-400']}>
                Please contact your Salesforce administrator to enable Chatter for your org.
              </Typography>
            </div>
          </div>
        ) : feedItems.length === 0 ? (
          <div className={styles.empty_state}>
            <MessageSquare size={24} color={carterColors['text-400']} style={{ marginBottom: '8px' }} />
            <Typography variant="body-regular" color={carterColors['text-400']}>
              No Chatter feed items yet.
            </Typography>
          </div>
        ) : (
          feedItems.map((item: any, index: number) => renderFeedItem(item, index))
        )}
      </div>
    </div>
  );
};

export default CRMChatterFeed;
