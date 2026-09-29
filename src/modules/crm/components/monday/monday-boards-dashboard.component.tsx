import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import {
  Button,
  Typography,
  carterColors,
} from 'shyftlabs-dsl';
import {
  RefreshCw,
  LogOut,
  Plus,
  Loader2,
  AlertCircle,
  Search,
  X,
  Grid3x3,
  Users,
  FileText,
} from 'lucide-react';
import { Skeleton } from '@/lib/material-ui';
import MondayService, { MondayBoard } from '@/services/crm/monday/monday.service';
import { showAlert } from '@/redux/actions';
import ROUTES from '@/common/routes';
import { useMondayBoards } from '../../hooks';
import styles from '../../styles/crm.module.scss';

interface MondayBoardsDashboardProps {
  connectionStatus: any;
  onDisconnect: () => void;
  onRefresh: () => void;
}

const MondayBoardsDashboard: React.FC<MondayBoardsDashboardProps> = ({
  connectionStatus,
  onDisconnect,
  onRefresh,
}) => {
  const router = useRouter();
  const mondayService = useMemo(() => new MondayService(), []);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardDescription, setNewBoardDescription] = useState('');
  const [newBoardKind, setNewBoardKind] = useState<'public' | 'private'>('public');
  const [isCreating, setIsCreating] = useState(false);

  // Fetch boards using custom hook
  const { boards, isLoading: boardsLoading, error: boardsError, mutate: mutateBoards } = useMondayBoards();

  // Extract unique workspaces from boards
  const workspaces = useMemo(() => {
    const workspaceMap = new Map<string, { id: string; name: string }>();
    boards.forEach((board: MondayBoard) => {
      if (board.workspace?.id && board.workspace?.name) {
        workspaceMap.set(board.workspace.id, {
          id: board.workspace.id,
          name: board.workspace.name,
        });
      }
    });
    return Array.from(workspaceMap.values());
  }, [boards]);

  // Define board precedence order
  const boardPrecedence = [
    'Deals',
    'Account management',
    'Accounts & Contacts',
    'Adops handoff',
    'Invoices',
    'Onsite rate',
    'Offsite Rate',
  ];

  // Helper function to get board sort order
  const getBoardSortOrder = (boardName: string): number => {
    const normalizedName = boardName.trim();
    const index = boardPrecedence.findIndex(
      (precedenceName) => normalizedName.toLowerCase() === precedenceName.toLowerCase()
    );
    // If found in precedence list, return its index (lower = higher priority)
    // If not found, return a large number to sort to the end
    return index !== -1 ? index : boardPrecedence.length + 1000;
  };

  // Filter boards to show only original boards (public/private), exclude any subitem boards
  const filteredBoards = useMemo(() => {
    const filtered = boards
      .filter((board: MondayBoard) => {
        // Filter by search term
        const matchesSearch = board.name.toLowerCase().includes(searchTerm.toLowerCase());
        // Only show original boards (public or private)
        const isOriginalBoard = !board.board_kind || 
          board.board_kind === 'public' || 
          board.board_kind === 'private';
        // Exclude boards whose names start with "Subitems"
        const isNotSubitemsBoard = !board.name?.startsWith('Subitems');
        // Exclude "Quotes & Invoices" board
        const isNotQuotesInvoices = board.name?.toLowerCase() !== 'quotes & invoices';
        // Filter by selected workspace
        const matchesWorkspace = !selectedWorkspaceId || board.workspace?.id === selectedWorkspaceId;
        return matchesSearch && isOriginalBoard && isNotSubitemsBoard && isNotQuotesInvoices && matchesWorkspace;
      })
      .sort((a: MondayBoard, b: MondayBoard) => {
        // Sort by precedence first
        const orderA = getBoardSortOrder(a.name);
        const orderB = getBoardSortOrder(b.name);
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        // If same precedence, sort alphabetically
        return a.name.localeCompare(b.name);
      });
    return filtered;
  }, [boards, searchTerm, selectedWorkspaceId]);

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await mondayService.disconnect();
      onDisconnect();
    } catch (error: any) {
      showAlert({
        variant: 'error' as any,
        title: error?.message || 'Failed to disconnect Monday.com',
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleCreateBoard = async () => {
    if (!newBoardName.trim()) {
      showAlert({
        variant: 'error' as any,
        title: 'Please enter a board name',
      });
      return;
    }

    setIsCreating(true);
    try {
      const board = await mondayService.createBoard(
        newBoardName.trim(),
        newBoardKind,
        newBoardDescription.trim() || undefined
      );
      
      showAlert({
        variant: 'success' as any,
        title: 'Board created successfully',
      });
      
      // Reset form
      setNewBoardName('');
      setNewBoardDescription('');
      setNewBoardKind('public');
      setShowCreateModal(false);
      
      // Refresh boards list
      mutateBoards();
      
      // Optionally navigate to the new board
      if (board.id) {
        setTimeout(() => {
          router.push(`${ROUTES.CRM.MONDAY.BOARD.replace('[boardId]', board.id)}`);
        }, 500);
      }
    } catch (error: any) {
      showAlert({
        variant: 'error' as any,
        title: error?.message || 'Failed to create board',
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className={styles.data_view_container}>
      {/* Header */}
      <div className={styles.data_view_header}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
          <div style={{ 
            width: '80px', 
            height: '80px', 
            borderRadius: '8px', 
            background: 'white',
            border: `1px solid ${carterColors['grey-200']}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px',
            boxSizing: 'border-box',
            flexShrink: 0
          }}>
            <Image
              src="https://cdn.monday.com/images/integrations/monday_icon.svg"
              alt="Monday.com"
              width={64}
              height={64}
              style={{ objectFit: 'contain' }}
            />
          </div>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center',
            gap: '4px',
            minHeight: '80px'
          }}>
            <div style={{ lineHeight: '1.2' }}>
              <Typography variant="h1-semibold" color={carterColors['text-900']}>
                Boards
              </Typography>
            </div>
            {connectionStatus?.workspace_name && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px', 
                padding: '4px',
                background: carterColors['grey-200'],
                borderRadius: '6px',
                width: 'fit-content'
              }}>
                <Users size={12} color={carterColors['text-600']} />
                <Typography variant="caption-regular" color={carterColors['text-600']}>
                  {connectionStatus.workspace_name}
                </Typography>
              </div>
            )}
          </div>
        </div>
        <div className={styles.header_actions}>
          <Button
            variant="primary"
            size="small"
            icon={<Plus size={16} />}
            iconPosition="left"
            label="New Board"
            onClick={() => setShowCreateModal(true)}
          />
          <Button
            variant="secondary"
            size="small"
            icon={<RefreshCw size={16} />}
            iconPosition="left"
            label="Refresh"
            onClick={() => {
              mutateBoards();
              onRefresh();
            }}
            disabled={boardsLoading}
          />
          <Button
            variant="tertiary"
            size="small"
            icon={<LogOut size={16} />}
            iconPosition="left"
            label="Disconnect"
            onClick={handleDisconnect}
            disabled={isDisconnecting}
          />
        </div>
      </div>

      {/* Search Bar and Workspace Filter */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', maxWidth: '500px', flex: 1, minWidth: '200px' }}>
          <Search 
            size={18} 
            style={{ 
              position: 'absolute', 
              left: '12px', 
              top: '50%', 
              transform: 'translateY(-50%)',
              color: carterColors['text-400'],
              pointerEvents: 'none',
              zIndex: 1
            }} 
          />
          <input
            type="text"
            placeholder="Search boards by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 40px',
              border: `1px solid ${carterColors['grey-200']}`,
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              transition: 'all 0.2s ease',
              backgroundColor: 'white',
              fontFamily: 'inherit',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = carterColors['brand-600'];
              e.target.style.boxShadow = `0 0 0 3px ${carterColors['brand-100']}`;
            }}
            onBlur={(e) => {
              e.target.style.borderColor = carterColors['grey-200'];
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        {/* Workspace Switcher */}
        {workspaces.length > 0 && (
          <div style={{ position: 'relative' }}>
            <select
              value={selectedWorkspaceId || ''}
              onChange={(e) => setSelectedWorkspaceId(e.target.value || null)}
              style={{
                padding: '10px 36px 10px 12px',
                border: `1px solid ${carterColors['grey-200']}`,
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                transition: 'all 0.2s ease',
                backgroundColor: 'white',
                fontFamily: 'inherit',
                cursor: 'pointer',
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='12' ` +
                  `viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath ` +
                  `d='M2 4L6 8L10 4' stroke='%23486570' stroke-width='1.5' ` +
                  `stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 12px center',
                minWidth: '180px',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = carterColors['brand-600'];
                e.target.style.boxShadow = `0 0 0 3px ${carterColors['brand-100']}`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = carterColors['grey-200'];
                e.target.style.boxShadow = 'none';
              }}
            >
              <option value="">All Workspaces</option>
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Boards Grid */}
      <div className={styles.data_view_content}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '8px'
        }}>
          {/* <Typography variant="h3-semibold" color={carterColors['text-900']}>
            All Boards
          </Typography> */}
          <div style={{
            padding: '6px 14px',
            background: carterColors['grey-200'],
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: 600,
            color: carterColors['text-700']
          }}>
            {filteredBoards.length} {filteredBoards.length === 1 ? 'board' : 'boards'}
          </div>
        </div>

        {boardsError ? (
          <div className={styles.error_state}>
            <AlertCircle size={48} color={carterColors['red-700']} />
            <Typography variant="body-semibold" color={carterColors['red-700']}>
              Failed to load boards
            </Typography>
            <div style={{ marginBottom: '20px' }}>
              <Typography variant="body-regular" color={carterColors['text-600']}>
                Please try refreshing or check your connection
              </Typography>
            </div>
            <Button
              variant="secondary"
              size="medium"
              label="Retry"
              icon={<RefreshCw size={16} />}
              onClick={() => mutateBoards()}
            />
          </div>
        ) : boardsLoading ? (
          <div className={styles.apps_grid}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} variant="rectangular" width="100%" height={200} style={{ borderRadius: '8px' }} />
            ))}
          </div>
        ) : filteredBoards.length === 0 ? (
          <div className={styles.empty_state}>
            <div style={{ 
              width: '64px', 
              height: '64px', 
              borderRadius: '8px',
              background: 'white',
              border: `1px solid ${carterColors['grey-200']}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '12px',
              marginBottom: '16px'
            }}>
              <Image
                src="https://cdn.monday.com/images/integrations/monday_icon.svg"
                alt="Monday.com"
                width={40}
                height={40}
                style={{ objectFit: 'contain', opacity: 0.5 }}
              />
            </div>
            <Typography variant="h3-semibold" color={carterColors['text-900']}>
              {searchTerm ? 'No boards found' : 'No boards yet'}
            </Typography>
            <div style={{ maxWidth: '400px' }}>
              <Typography variant="body-regular" color={carterColors['text-600']}>
                {searchTerm 
                  ? `No boards match "${searchTerm}". Try a different search term.`
                  : 'Create your first board to get started with Monday.com integration.'}
              </Typography>
            </div>
            {!searchTerm && (
              <Button
                variant="primary"
                size="medium"
                label="Create Your First Board"
                icon={<Plus size={18} />}
                onClick={() => setShowCreateModal(true)}
              />
            )}
          </div>
        ) : (
          <div className={styles.apps_grid}>
            {filteredBoards.map((board: MondayBoard) => {
              const groupCount = board.groups?.length || 0;
              const columnCount = board.columns?.length || 0;

              return (
                <div
                  key={board.id}
                  onClick={() => router.push(`${ROUTES.CRM.MONDAY.BOARD.replace('[boardId]', board.id)}`)}
                  className={styles.app_card}
                >
                  <div className={styles.app_card_header}>
                    <div className={styles.app_info}>
                      <Typography variant="h3-semibold" color={carterColors['text-900']}>
                        {board.name}
                      </Typography>
                      {board.description && (
                        <div style={{ marginTop: '4px' }}>
                          <Typography variant="body-regular" color={carterColors['text-600']}>
                            {board.description}
                          </Typography>
                        </div>
                      )}
                    </div>
                    {/* Board Kind Badge */}
                    {board.board_kind && (
                      <div style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 600,
                        textTransform: 'capitalize',
                        ...(board.board_kind === 'public' 
                          ? {
                              backgroundColor: carterColors['green-200'],
                              border: `1px solid ${carterColors['green-500']}`,
                              color: carterColors['green-700']
                            }
                          : {
                              backgroundColor: carterColors['brand-100'],
                              border: `1px solid ${carterColors['brand-200']}`,
                              color: carterColors['brand-700']
                            }
                        )
                      }}>
                        {board.board_kind}
                      </div>
                    )}
                  </div>

                  <div className={styles.app_card_footer}>
                    <div style={{ display: 'flex', gap: '24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: carterColors['text-600'] }}>
                        <Grid3x3 size={16} />
                        <span>{groupCount} {groupCount === 1 ? 'group' : 'groups'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: carterColors['text-600'] }}>
                        <FileText size={16} />
                        <span>{columnCount} {columnCount === 1 ? 'column' : 'columns'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Board Modal */}
      {showCreateModal && (
        <div
          className={styles.modal_overlay}
          onClick={() => !isCreating && setShowCreateModal(false)}
        >
          <div
            className={styles.modal_content}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modal_header}>
              <Typography variant="h2-semibold" color={carterColors['text-900']}>
                Create New Board
              </Typography>
              <Button
                variant="tertiary"
                size="small"
                icon={<X size={18} />}
                onClick={() => !isCreating && setShowCreateModal(false)}
                disabled={isCreating}
              />
            </div>

            <div className={styles.modal_body}>
              <div className={styles.form_group}>
                <div className={styles.form_label}>
                  <Typography variant="body-semibold">
                    Board Name <span className={styles.required}>*</span>
                  </Typography>
                </div>
                <input
                  type="text"
                  placeholder="Enter board name..."
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  disabled={isCreating}
                  className={styles.form_input}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isCreating && newBoardName.trim()) {
                      handleCreateBoard();
                    }
                  }}
                />
              </div>

              <div className={styles.form_group}>
                <div className={styles.form_label}>
                  <Typography variant="body-semibold">
                    Description (Optional)
                  </Typography>
                </div>
                <textarea
                  placeholder="Enter board description..."
                  value={newBoardDescription}
                  onChange={(e) => setNewBoardDescription(e.target.value)}
                  disabled={isCreating}
                  rows={3}
                  className={styles.form_textarea}
                />
              </div>

              <div className={styles.form_group}>
                <div className={styles.form_label}>
                  <Typography variant="body-semibold">
                    Board Type
                  </Typography>
                </div>
                <div className={styles.board_type_options}>
                  <button
                    type="button"
                    onClick={() => !isCreating && setNewBoardKind('public')}
                    disabled={isCreating}
                    className={`${styles.board_type_option} ${newBoardKind === 'public' ? styles.board_type_option_active : ''}`}
                  >
                    <div className={styles.option_title}>
                      <Typography variant="body-semibold">
                        Public
                      </Typography>
                    </div>
                    <div className={styles.option_description}>
                      <Typography variant="caption-regular">
                        Visible to all workspace members
                      </Typography>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => !isCreating && setNewBoardKind('private')}
                    disabled={isCreating}
                    className={`${styles.board_type_option} ${newBoardKind === 'private' ? styles.board_type_option_active : ''}`}
                  >
                    <div className={styles.option_title}>
                      <Typography variant="body-semibold">
                        Private
                      </Typography>
                    </div>
                    <div className={styles.option_description}>
                      <Typography variant="caption-regular">
                        Only visible to you
                      </Typography>
                    </div>
                  </button>
                </div>
              </div>

              <div className={styles.modal_actions}>
                <Button
                  variant="secondary"
                  size="medium"
                  label="Cancel"
                  onClick={() => !isCreating && setShowCreateModal(false)}
                  disabled={isCreating}
                />
                <Button
                  variant="primary"
                  size="medium"
                  label={isCreating ? 'Creating...' : 'Create Board'}
                  icon={isCreating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  onClick={handleCreateBoard}
                  disabled={isCreating || !newBoardName.trim()}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MondayBoardsDashboard;
