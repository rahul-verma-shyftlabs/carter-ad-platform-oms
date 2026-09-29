import React, { useState, useMemo, useRef } from 'react';
import { Button, Typography, carterColors, CarterTextArea } from 'shyftlabs-dsl';
import { Send, AtSign, Paperclip, X, File } from 'lucide-react';
import useSWR from 'swr';
import { useSelector } from 'react-redux';
import { IRootState } from '@/redux/reducers';
import SalesforceService from '@/services/crm/salesforce/salesforce.service';
import MediaService from '@/services/media/media.service';
import { showAlert } from '@/redux/actions';
import styles from '../styles/ticket-comments.module.scss';

interface Attachment {
  url: string;
  name: string;
  type?: string;
  size?: number;
}

interface CRMComment {
  id: string;
  object_type: string;
  object_id: string;
  content: string;
  created_by_user_account_id: string;
  created_by_user_name: string;
  mentioned_user_account_ids?: string[];
  attachments?: Attachment[];
  created_at: string;
  updated_at: string;
}

interface CRMCommentsProps {
  objectType: 'lead' | 'contact' | 'opportunity';
  objectId: string;
  users: Array<{ id: string; name: string; accountId: string }>;
  currentUserId?: string;
  onCommentAdded?: () => void;
}

const CRMComments: React.FC<CRMCommentsProps> = ({
  objectType,
  objectId,
  users,
  currentUserId: _currentUserId,
  onCommentAdded,
}) => {
  const salesforceService = useMemo(() => new SalesforceService(), []);
  const mediaService = useMemo(() => new MediaService(), []);
  const reduxUser = useSelector((state: IRootState) => state.common.user);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [commentText, setCommentText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<{ [key: string]: boolean }>({});
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);

  // Fetch comments
  const { data: commentsData, mutate, isLoading } = useSWR(
    objectId ? ['crm-comments', objectType, objectId] : null,
    () => salesforceService.getCRMComments(objectType, objectId),
    {
      revalidateOnFocus: false,
    }
  );

  const comments = commentsData?.comments || [];

  // Filter users for mention suggestions
  const mentionSuggestions = useMemo(() => {
    if (!mentionQuery) return users.slice(0, 5);
    const query = mentionQuery.toLowerCase();
    return users
      .filter(user => 
        user.name.toLowerCase().includes(query)
      )
      .slice(0, 5);
  }, [users, mentionQuery]);

  // Handle text input with mention detection
  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPosition = e.target.selectionStart;
    
    // Check for @ mention
    const textBeforeCursor = value.substring(0, cursorPosition);
    const mentionMatch = textBeforeCursor.match(/@([^\s@]*)$/);
    
    const textAfterCursor = value.substring(cursorPosition);
    const hasSpaceAfter = textAfterCursor.match(/^\s/);
    
    if (mentionMatch && !hasSpaceAfter) {
      setMentionQuery(mentionMatch[1]);
      setMentionStartIndex(cursorPosition - mentionMatch[0].length);
      setShowMentionSuggestions(true);
      setSelectedMentionIndex(0);
    } else {
      setShowMentionSuggestions(false);
      setMentionQuery('');
      setMentionStartIndex(-1);
    }
    
    setCommentText(value);
  };

  // Handle mention selection
  const handleMentionSelect = (user: { id: string; name: string; accountId: string }) => {
    if (mentionStartIndex === -1) return;
    
    const beforeMention = commentText.substring(0, mentionStartIndex);
    const afterMention = commentText.substring(mentionStartIndex + 1 + mentionQuery.length);
    const newText = `${beforeMention}@${user.name} ${afterMention}`;
    
    setCommentText(newText);
    setShowMentionSuggestions(false);
    setMentionQuery('');
    setMentionStartIndex(-1);
  };

  // Handle keyboard navigation in mention suggestions
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentionSuggestions && mentionSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex(prev => 
          prev < mentionSuggestions.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex(prev => prev > 0 ? prev - 1 : 0);
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleMentionSelect(mentionSuggestions[selectedMentionIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentionSuggestions(false);
        setMentionQuery('');
        setMentionStartIndex(-1);
      } else if (e.key === ' ' || e.key === 'Space') {
        setShowMentionSuggestions(false);
        setMentionQuery('');
        setMentionStartIndex(-1);
      }
    } else if (e.key === 'Enter' && !e.shiftKey && commentText.trim()) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Extract mentioned users from comment text
  const extractMentions = (text: string): string[] => {
    const mentions: string[] = [];
    const mentionRegex = /@([^\s@]+(?:\s+[^\s@]+)*)/g;
    let match;
    const processedNames = new Set<string>();
    
    while ((match = mentionRegex.exec(text)) !== null) {
      const mentionedName = match[1].trim();
      if (mentionedName && !processedNames.has(mentionedName.toLowerCase())) {
        processedNames.add(mentionedName.toLowerCase());
        
        const exactMatch = users.find(u => 
          u.name.toLowerCase() === mentionedName.toLowerCase()
        );
        
        if (exactMatch) {
          // Use id (UUID) - this is the user's UUID from the users table
          const userId = exactMatch.id;
          if (userId) {
            mentions.push(String(userId));
          }
        } else {
          const partialMatch = users.find(u => {
            const userName = u.name.toLowerCase();
            const searchName = mentionedName.toLowerCase();
            return userName.includes(searchName) || searchName.includes(userName);
          });
          
          if (partialMatch) {
            // Use id (UUID) - this is the user's UUID from the users table
            const userId = partialMatch.id;
            if (userId) {
              mentions.push(String(userId));
            }
          }
        }
      }
    }
    
    return Array.from(new Set(mentions));
  };

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const maxSize = 20 * 1024 * 1024; // 20MB

    for (const file of fileArray) {
      if (file.size > maxSize) {
        showAlert({
          variant: 'warning',
          title: `File ${file.name} exceeds 20MB limit`,
        });
        continue;
      }

      const fileId = `${Date.now()}-${file.name}`;
      setUploadingFiles(prev => ({ ...prev, [fileId]: true }));

      try {
        const response = await mediaService.uploadMedia(file, file.name);
        const url = response.downloadUrl || response.signedUrl;
        
        if (url) {
          const attachment: Attachment = {
            url: url.split(' ').join(''), // Remove any spaces
            name: file.name,
            type: file.type,
            size: file.size,
          };
          setAttachments(prev => [...prev, attachment]);
        }
      } catch (error: any) {
        showAlert({
          variant: 'warning',
          title: `Failed to upload ${file.name}: ${error?.message || 'Upload failed'}`,
        });
      } finally {
        setUploadingFiles(prev => {
          const newState = { ...prev };
          delete newState[fileId];
          return newState;
        });
      }
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove attachment
  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Format file size
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Check if file is an image
  const isImage = (type?: string): boolean => {
    return type?.startsWith('image/') || false;
  };

  // Handle comment submission
  const handleSubmit = async () => {
    if (!commentText.trim() && attachments.length === 0) {
      showAlert({
        variant: 'warning',
        title: 'Please enter a comment or attach a file',
      });
      return;
    }

    try {
      const mentionedUserIds = extractMentions(commentText);
      
      // Get user account ID from Redux state
      const userAccountId = reduxUser?.id || reduxUser?.accountId || '';
      if (!userAccountId) {
        showAlert({
          variant: 'warning',
          title: 'User account ID not found. Please refresh the page.',
        });
        return;
      }
      
      // Get user name from Redux state
      let userName = 'Unknown User';
      if (reduxUser?.name) {
        userName = reduxUser.name;
      } else if (reduxUser?.firstName || reduxUser?.lastName) {
        const firstName = reduxUser.firstName || '';
        const lastName = reduxUser.lastName || '';
        userName = `${firstName} ${lastName}`.trim();
      } else if (reduxUser?.email) {
        userName = reduxUser.email;
      }
      
      const commentData = {
        content: commentText.trim() || '',
        created_by_user_account_id: userAccountId,
        created_by_user_name: userName,
        mentioned_user_account_ids: mentionedUserIds.length > 0 ? mentionedUserIds : undefined,
        attachments: attachments.length > 0 ? attachments : undefined,
      };

      await salesforceService.createCRMComment(objectType, objectId, commentData);
      setCommentText('');
      setAttachments([]);
      setShowMentionSuggestions(false);
      setMentionQuery('');
      setMentionStartIndex(-1);
      await mutate();
      onCommentAdded?.();
      showAlert({
        variant: 'success',
        title: 'Comment added successfully',
      });
    } catch (error: any) {
      showAlert({
        variant: 'warning' as any,
        title: error?.message || 'Failed to add comment',
      });
    }
  };

  // Get user name by ID
  const getUserName = (comment: CRMComment): string => {
    if (comment?.created_by_user_name) {
      return comment.created_by_user_name;
    }
    const userId = comment.created_by_user_account_id;
    let user = users.find(u => String(u.accountId) === String(userId));
    if (!user) {
      user = users.find(u => String(u.id) === String(userId));
    }
    return user?.name || 'Unknown User';
  };

  return (
    <div className={styles.comments_container}>
      <div className={styles.comments_header}>
        <Typography variant="body-large-semibold" color={carterColors['text-900']}>
          Comment
        </Typography>
      </div>

      {/* Comments List - Scrollable */}
      <div className={styles.comments_list}>
        {isLoading ? (
          <div className={styles.loading_state}>
            <Typography variant="body-regular" color={carterColors['text-500']}>
              Loading comments...
            </Typography>
          </div>
        ) : comments.length === 0 ? (
          <div className={styles.empty_state} style={{ height: '100%' }}>
            <Typography variant="body-regular" color={carterColors['text-500']}>
              No comments yet
            </Typography>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className={styles.comment_item}>
              <div className={styles.comment_header}>
                <div className={styles.comment_author}>
                  <Typography variant="body-semibold" color={carterColors['text-900']}>
                    {getUserName(comment)}
                  </Typography>
                  <Typography variant="caption-regular" color={carterColors['text-500']}>
                    {new Date(comment.created_at).toLocaleString('en-US', {
                      timeZone: 'America/New_York',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    })}
                  </Typography>
                </div>
              </div>
              <div className={styles.comment_content}>
                {comment.content && comment.content.trim() && (
                  <Typography variant="body-regular" color={carterColors['text-700']}>
                    {comment.content}
                  </Typography>
                )}
                {comment.attachments && comment.attachments.length > 0 && (
                  <div className={styles.attachments_container}>
                    {comment.attachments.map((attachment: Attachment, idx: number) => (
                      <div key={idx} className={styles.attachment_item}>
                        {isImage(attachment.type) ? (
                          <a
                            href={attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.attachment_image_link}
                          >
                            <img
                              src={attachment.url}
                              alt={attachment.name}
                              className={styles.attachment_image}
                            />
                          </a>
                        ) : (
                          <a
                            href={attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.attachment_file_link}
                          >
                            <File size={16} />
                            <span>{attachment.name}</span>
                            {attachment.size && (
                              <span className={styles.attachment_size}>
                                {formatFileSize(attachment.size)}
                              </span>
                            )}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* {comment.mentioned_user_account_ids && comment.mentioned_user_account_ids.length > 0 && (
                <div className={styles.mentioned_users}>
                  {comment.mentioned_user_account_ids.map((userId: string) => {
                    let user = users.find(u => String(u.accountId) === String(userId));
                    if (!user) {
                      user = users.find(u => String(u.id) === String(userId));
                    }
                    return (
                      <span key={userId} className={styles.mention_badge}>
                        @{user?.name || 'Unknown User'}
                      </span>
                    );
                  })}
                </div>
              )} */}
            </div>
          ))
        )}
      </div>

      {/* Comment Input - Fixed at Bottom */}
      <div className={styles.comment_input_container_fixed}>
        <div className={styles.comment_input_wrapper}>
          <CarterTextArea
            value={commentText}
            onChange={handleCommentChange}
            onKeyDown={handleKeyDown}
            placeholder="Add a comment..."
            rows={2}
            resize="vertical"
          />
          {showMentionSuggestions && mentionSuggestions.length > 0 && (
            <div className={styles.mention_suggestions}>
              {mentionSuggestions.map((user, index) => (
                <div
                  key={user.id}
                  className={`${styles.mention_suggestion_item} ${
                    index === selectedMentionIndex ? styles.selected : ''
                  }`}
                  onClick={() => handleMentionSelect(user)}
                  onMouseEnter={() => setSelectedMentionIndex(index)}
                >
                  <AtSign size={14} color={carterColors['text-600']} />
                  <Typography variant="body-regular" color={carterColors['text-900']}>
                    {user.name}
                  </Typography>
                </div>
              ))}
            </div>
          )}
          {attachments.length > 0 && (
            <div className={styles.attachments_preview}>
              {attachments.map((attachment, index) => (
                <div key={index} className={styles.attachment_preview_item}>
                  {isImage(attachment.type) ? (
                    <div className={styles.attachment_preview_image}>
                      <img src={attachment.url} alt={attachment.name} />
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(index)}
                        className={styles.remove_attachment_btn}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className={styles.attachment_preview_file}>
                      <File size={14} />
                      <span>{attachment.name}</span>
                      {attachment.size && (
                        <span className={styles.attachment_size}>
                          {formatFileSize(attachment.size)}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(index)}
                        className={styles.remove_attachment_btn}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className={styles.comment_actions}>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
            <Button
              variant="secondary"
              size="small"
              icon={<Paperclip size={14} />}
              onClick={() => fileInputRef.current?.click()}
              disabled={Object.keys(uploadingFiles).length > 0}
            />
            <Button
              variant="primary"
              size="small"
              label="Post"
              icon={<Send size={14} />}
              onClick={handleSubmit}
              disabled={(!commentText.trim() && attachments.length === 0) || Object.keys(uploadingFiles).length > 0}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CRMComments;
