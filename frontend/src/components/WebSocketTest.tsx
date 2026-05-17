'use client';

import { useEffect, useState } from 'react';
import { createStompClient } from '@/lib/stomp';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * Component test WebSocket Chat
 * Để debug và kiểm tra kết nối WebSocket
 */
export function WebSocketTest() {
  const [token, setToken] = useState('');
  const [userId, setUserId] = useState('2');
  const [receiverId, setReceiverId] = useState('3');
  const [message, setMessage] = useState('Hello from WebSocket test!');
  const [isConnected, setIsConnected] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [client, setClient] = useState<any>(null);

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${msg}`]);
    console.log(msg);
  };

  useEffect(() => {
    // Get token from localStorage
    const storedToken = localStorage.getItem('auth_token');
    if (storedToken) {
      setToken(storedToken);
      addLog(`✅ Token loaded from localStorage: ${storedToken.substring(0, 50)}...`);
    } else {
      addLog('⚠️ No token found in localStorage');
    }
  }, []);

  const handleConnect = () => {
    if (!token) {
      addLog('❌ Cannot connect: No token');
      return;
    }

    addLog('🔌 Creating STOMP client...');
    const stompClient = createStompClient(token);

    stompClient.onConnect = (frame) => {
      addLog('✅ STOMP Connected!');
      addLog(`Frame: ${JSON.stringify(frame)}`);
      setIsConnected(true);

      // Subscribe to messages
      const destination = `/topic/messages/${userId}`;
      addLog(`📡 Subscribing to: ${destination}`);
      
      stompClient.subscribe(destination, (message) => {
        addLog(`📨 Received message: ${message.body}`);
        try {
          const data = JSON.parse(message.body);
          addLog(`   Parsed: ${JSON.stringify(data, null, 2)}`);
        } catch (e) {
          addLog(`   (Not JSON)`);
        }
      });
    };

    stompClient.onStompError = (frame) => {
      addLog(`🔴 STOMP Error: ${frame.headers['message']}`);
      addLog(`   Details: ${frame.body}`);
      setIsConnected(false);
    };

    stompClient.onWebSocketClose = () => {
      addLog('⚠️ WebSocket closed');
      setIsConnected(false);
    };

    addLog('🚀 Activating client...');
    stompClient.activate();
    setClient(stompClient);
  };

  const handleSendMessage = () => {
    if (!client || !client.connected) {
      addLog('❌ Cannot send: Not connected');
      return;
    }

    const payload = {
      receiverId: parseInt(receiverId),
      content: message
    };

    addLog(`📤 Sending message to /app/chat.send`);
    addLog(`   Payload: ${JSON.stringify(payload, null, 2)}`);

    try {
      client.publish({
        destination: '/app/chat.send',
        body: JSON.stringify(payload)
      });
      addLog('✅ Message sent successfully');
    } catch (error: any) {
      addLog(`❌ Error sending message: ${error.message}`);
    }
  };

  const handleDisconnect = () => {
    if (client) {
      addLog('🔌 Disconnecting...');
      client.deactivate();
      setClient(null);
      setIsConnected(false);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-4">WebSocket Chat Test</h1>
        
        {/* Connection Status */}
        <div className="mb-4 p-4 rounded-lg bg-gray-100">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="font-medium">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Configuration */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2">Token</label>
            <Input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="JWT Token"
              className="font-mono text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Your User ID</label>
              <Input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Receiver ID</label>
              <Input
                type="text"
                value={receiverId}
                onChange={(e) => setReceiverId(e.target.value)}
                placeholder="3"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Message</label>
            <Input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mb-6">
          {!isConnected ? (
            <Button onClick={handleConnect} className="bg-green-600 hover:bg-green-700">
              Connect
            </Button>
          ) : (
            <>
              <Button onClick={handleSendMessage} className="bg-blue-600 hover:bg-blue-700">
                Send Message
              </Button>
              <Button onClick={handleDisconnect} variant="destructive">
                Disconnect
              </Button>
            </>
          )}
          <Button onClick={clearLogs} variant="outline">
            Clear Logs
          </Button>
        </div>

        {/* Logs */}
        <div>
          <h2 className="text-lg font-semibold mb-2">Logs</h2>
          <div className="bg-black text-green-400 font-mono text-xs p-4 rounded-lg h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-gray-500">No logs yet...</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
