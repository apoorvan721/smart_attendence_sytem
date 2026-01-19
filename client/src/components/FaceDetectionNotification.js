import React, { useState, useEffect, useRef } from 'react';

const FaceDetectionNotification = ({ faces }) => {
  const [notifications, setNotifications] = useState([]);
  const previousFacesRef = useRef([]);

  useEffect(() => {
    if (!faces || faces.length === 0) return;

    // Find newly added faces
    const newlyDetected = faces.filter(face => !previousFacesRef.current.includes(face));
    
    if (newlyDetected.length > 0) {
      console.log('📢 Creating notifications for:', newlyDetected);
      
      // Create notifications for each new face
      newlyDetected.forEach((studentId, index) => {
        setTimeout(() => {
          const newNotification = {
            id: Date.now() + index,
            studentId: studentId,
            timestamp: new Date()
          };

          console.log('✅ Adding notification:', newNotification);
          setNotifications(prev => {
            const updated = [...prev, newNotification];
            console.log('📋 Notifications state updated:', updated);
            return updated;
          });

          // Auto-remove notification after 5 seconds
          setTimeout(() => {
            setNotifications(prev => {
              const filtered = prev.filter(n => n.id !== newNotification.id);
              console.log('🗑️ Notification removed, remaining:', filtered.length);
              return filtered;
            });
          }, 5000);
        }, index * 200); // Stagger notifications by 200ms
      });

      // Update reference
      previousFacesRef.current = faces;
    }
  }, [faces]);

  console.log('Rendering FaceDetectionNotification with notifications:', notifications);

  return (
    <>
      <style>{`
        @keyframes slideInNotification {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        maxWidth: '300px'
      }}>
        {notifications && notifications.map(notification => (
          <div
            key={notification.id}
            style={{
              backgroundColor: '#4caf50',
              color: 'white',
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '10px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              animation: 'slideInNotification 0.5s ease-out',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              minWidth: '250px'
            }}
          >
            <span style={{ fontSize: '1.5rem' }}>✅</span>
            <div>
              <strong>Face Detected!</strong>
              <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                Student ID: {notification.studentId}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default FaceDetectionNotification;
