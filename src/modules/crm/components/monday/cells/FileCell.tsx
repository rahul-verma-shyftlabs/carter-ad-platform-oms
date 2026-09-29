import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Typography, carterColors } from 'shyftlabs-dsl';
import { File, Download, ExternalLink, X, FileSpreadsheet } from 'lucide-react';
import styles from '../../../styles/crm.module.scss';

interface FileCellProps {
  value: any;
  itemId: string;
  columnId: string;
  boardId: string;
  onUpdate?: () => void;
}

interface FileInfo {
  name: string;
  url: string;
  assetId?: string;
  fileType?: string;
  isImage?: boolean;
}

const POPUP_MAX_HEIGHT = 400;
const POPUP_MIN_WIDTH = 280;
const POPUP_MAX_WIDTH = 400;
const POPUP_PADDING = 8;

const FileCell: React.FC<FileCellProps> = ({ value, itemId, boardId }) => {
  const [showFiles, setShowFiles] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [popupPosition, setPopupPosition] = useState<{ top: number; left: number } | null>(null);

  // Extract asset ID from Monday.com file URL
  const extractAssetId = (url: string): string | null => {
    try {
      // Pattern: .../resources/{assetId}/...
      const match = url.match(/\/resources\/(\d+)/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  };

  // Construct Monday.com file viewer URL
  const getFileViewerUrl = (file: FileInfo): string => {
    const assetId = file.assetId || extractAssetId(file.url);
    if (assetId && boardId && itemId) {
      // Format: https://shyftlabs-unit.monday.com/boards/{boardId}/pulses/{itemId}?asset_id={assetId}
      return `https://shyftlabs-unit.monday.com/boards/${boardId}/pulses/${itemId}?asset_id=${assetId}`;
    }
    // Fallback to original URL if we can't construct the viewer URL
    return file.url;
  };

  // Parse files from value
  const files: FileInfo[] = useMemo(() => {
    const fileList: FileInfo[] = [];
    
    // Try to get files from value.value (JSON string)
    if (value?.value && typeof value.value === 'string') {
      try {
        const parsed = JSON.parse(value.value);
        if (parsed.files && Array.isArray(parsed.files)) {
          // Process each file in the array
          parsed.files.forEach((file: any) => {
            // Construct URL from assetId for each file
            let fileUrl = '';
            if (file.assetId) {
              // Construct URL from assetId
              fileUrl = `https://shyftlabs-unit.monday.com/protected_static/33400184/resources/${file.assetId}/${encodeURIComponent(file.name || 'file')}`;
            } else if (value.text) {
              // Fallback to value.text if assetId not available
              fileUrl = value.text;
            }
            
            // Add file if it has a name or URL
            if (file.name || fileUrl) {
              fileList.push({
                name: file.name || 'Untitled File',
                url: fileUrl,
                assetId: file.assetId,
                fileType: file.fileType,
                isImage: file.isImage === 'true' || file.isImage === true,
              });
            }
          });
        } else if (value.text) {
          // If no files array but text exists, treat as single file
          fileList.push({
            name: value.text.split('/').pop() || 'File',
            url: value.text,
          });
        }
      } catch {
        // If parsing fails, try to use text URL directly
        if (value.text) {
          fileList.push({
            name: value.text.split('/').pop() || 'File',
            url: value.text,
          });
        }
      }
    } else if (value?.text) {
      // If value.text is a URL, use it directly
      fileList.push({
        name: value.text.split('/').pop() || 'File',
        url: value.text,
      });
    } else if (value?.files && Array.isArray(value.files)) {
      // If files array is directly in value
      value.files.forEach((file: any) => {
        // Construct URL from assetId if available
        let fileUrl = file.url || value.text || '';
        if (!fileUrl && file.assetId) {
          fileUrl = `https://shyftlabs-unit.monday.com/protected_static/33400184/resources/${file.assetId}/${encodeURIComponent(file.name || 'file')}`;
        }
        
        if (file.name || fileUrl) {
          fileList.push({
            name: file.name || 'Untitled File',
            url: fileUrl,
            assetId: file.assetId,
            fileType: file.fileType,
            isImage: file.isImage === 'true' || file.isImage === true,
          });
        }
      });
    }

    return fileList;
  }, [value]);

  const fileCount = files.length;

  // Compute popup position so it stays within viewport and isn't cropped
  useEffect(() => {
    if (!showFiles || !triggerRef.current || typeof document === 'undefined') {
      setPopupPosition(null);
      return;
    }
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    let top: number;
    if (spaceBelow >= POPUP_MAX_HEIGHT + POPUP_PADDING || spaceBelow >= spaceAbove) {
      top = rect.bottom + 4;
    } else {
      top = rect.top - POPUP_MAX_HEIGHT - 4;
    }

    let left = rect.left;
    if (left + POPUP_MAX_WIDTH > viewportWidth - POPUP_PADDING) {
      left = viewportWidth - POPUP_MAX_WIDTH - POPUP_PADDING;
    }
    if (left < POPUP_PADDING) {
      left = POPUP_PADDING;
    }

    setPopupPosition({ top, left });
  }, [showFiles]);

  // Check if any file is Excel
  const hasExcelFile = useMemo(() => {
    return files.some(file => {
      const excelExtensions = ['.xlsx', '.xls', '.xlsm', '.xlsb', '.xltx', '.xltm'];
      const lowerName = file.name.toLowerCase();
      return excelExtensions.some(ext => lowerName.endsWith(ext));
    });
  }, [files]);

  // Check if file is Excel
  const handleDownload = (file: FileInfo, e: React.MouseEvent) => {
    e.stopPropagation();
    if (file.url) {
      // Force download by creating a temporary anchor element
      const link = document.createElement('a');
      link.href = file.url;
      link.download = file.name;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleView = (file: FileInfo, e: React.MouseEvent) => {
    e.stopPropagation();
    if (file.url) {
      // Use Monday.com viewer URL for all files
      const viewerUrl = getFileViewerUrl(file);
      window.open(viewerUrl, '_blank', 'noopener,noreferrer');
    }
  };

  if (fileCount === 0) {
    return (
      <div
        className={styles.monday_cell}
        style={{
          padding: '6px 8px',
          minWidth: '120px',
          display: 'flex',
          alignItems: 'center',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: '12px' }}>
          <Typography variant="body-regular" color={carterColors['text-400']}>
            -
          </Typography>
        </div>
      </div>
    );
  }

  return (
    <div
      className={styles.monday_cell}
      style={{
        padding: '6px 8px',
        minWidth: '120px',
        position: 'relative',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        ref={triggerRef}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          cursor: 'pointer',
        }}
        onClick={(e) => {
          e.stopPropagation();
          setShowFiles(!showFiles);
        }}
      >
        {hasExcelFile ? (
          <FileSpreadsheet size={14} color={carterColors['brand-600']} />
        ) : (
          <File size={14} color={carterColors['brand-600']} />
        )}
        <div style={{ fontSize: '12px' }}>
          <Typography variant="body-regular" color={carterColors['text-900']}>
            {fileCount} file{fileCount > 1 ? 's' : ''}
          </Typography>
        </div>
      </div>

      {/* Files Popup - rendered in portal so it isn't cropped by table overflow */}
      {showFiles && popupPosition !== null && typeof document !== 'undefined' && createPortal(
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1999,
            }}
            onClick={(e) => {
              e.stopPropagation();
              setShowFiles(false);
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: popupPosition.top,
              left: popupPosition.left,
              backgroundColor: 'white',
              border: `1px solid ${carterColors['grey-200']}`,
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              minWidth: `${POPUP_MIN_WIDTH}px`,
              maxWidth: `${POPUP_MAX_WIDTH}px`,
              maxHeight: `${POPUP_MAX_HEIGHT}px`,
              overflowY: 'auto',
              zIndex: 2000,
              padding: '8px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              borderBottom: `1px solid ${carterColors['grey-200']}`,
              marginBottom: '8px',
            }}>
              <Typography variant="body-semibold" color={carterColors['text-900']}>
                Files ({fileCount})
              </Typography>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowFiles(false);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  color: carterColors['text-600'],
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {files.map((file, index) => (
                <div
                  key={index}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${carterColors['grey-200']}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    transition: 'background-color 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = carterColors['grey-100'];
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'white';
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    flex: 1,
                    minWidth: 0,
                  }}>
                    {(() => {
                      const excelExtensions = ['.xlsx', '.xls', '.xlsm', '.xlsb', '.xltx', '.xltm'];
                      const lowerName = file.name.toLowerCase();
                      const isExcel = excelExtensions.some(ext => lowerName.endsWith(ext));
                      return isExcel ? (
                        <FileSpreadsheet size={16} color={carterColors['brand-600']} style={{ flexShrink: 0 }} />
                      ) : (
                        <File size={16} color={carterColors['brand-600']} style={{ flexShrink: 0 }} />
                      );
                    })()}
                    <div style={{
                      flex: 1,
                      minWidth: 0,
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontSize: '13px',
                      }}>
                        <Typography
                          variant="body-regular"
                          color={carterColors['text-900']}
                        >
                          {file.name}
                        </Typography>
                      </div>
                    </div>
                  </div>
                  <div style={{
                    display: 'flex',
                    gap: '6px',
                    flexShrink: 0,
                  }}>
                    <button
                      onClick={(e) => handleView(file, e)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        borderRadius: '4px',
                        color: carterColors['brand-600'],
                        transition: 'background-color 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = carterColors['brand-100'];
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                      title="View file"
                    >
                      <ExternalLink size={14} />
                    </button>
                    <button
                      onClick={(e) => handleDownload(file, e)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        borderRadius: '4px',
                        color: carterColors['brand-600'],
                        transition: 'background-color 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = carterColors['brand-100'];
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                      title="Download file"
                    >
                      <Download size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>,
        document.body
      )}

    </div>
  );
};

export default FileCell;
