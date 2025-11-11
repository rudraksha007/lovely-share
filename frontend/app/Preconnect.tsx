'use client';
import { useState } from 'react';
import { toast } from 'react-toastify';
import type { Partner } from './page';
import { PiPlugsConnectedThin } from 'react-icons/pi';
import { SocketHandler } from './socket-handle';
import { Peer, PeersPayload, VisibilityAckPayload } from '../../shared/types';
import { TfiReload } from 'react-icons/tfi';
import { FaPeopleGroup } from 'react-icons/fa6';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';

interface PreconnectProps {
    onConnect: (partner: Partner) => void;
    socket: SocketHandler | null;
    onInit: (name: string, pass: string) => void; // Placeholder for socket handler
}

export enum ConnectionStatus {
    Idle = 'idle',
    Connecting = 'connecting',
    Connected = 'connected',
    Failed = 'failed',
}

export default function Preconnect({ onConnect, onInit, socket }: PreconnectProps) {
    const [config, setConfig] = useState<{
        connectionStatus: ConnectionStatus;
        connectingPeer: Peer | null;
        peerId: string;
        isLoadingPeers: boolean;
        isLoadingVisibility: boolean;
        displayName: string;
        publicVisibility: boolean;
        password: string;
        peerPass: string;
    }>({
        connectionStatus: ConnectionStatus.Idle,
        connectingPeer: null,
        isLoadingVisibility: false,
        isLoadingPeers: false,
        peerId: '',
        displayName: '',
        publicVisibility: false,
        password: '',
        peerPass: ''
    });
    const [error, setError] = useState('');
    const [publicPeers, setPublicPeers] = useState<Peer[]>([]);

    // Simulate fetching public peers
    const fetchPeers = async () => {
        if (!socket) return;
        setConfig((prev) => ({ ...prev, isLoadingPeers: true }));
        socket.onIncomingOffer((from, offer) => {
            connectionPopup(from.name, from.id);
        })
        socket.queueMsg({ id: (Math.random() * 10000).toString(), type: "PEERS_REQUEST", data: null }).then(msg=>{
            setPublicPeers((msg.data as PeersPayload).peers);
            setConfig((prev) => ({ ...prev, isLoadingPeers: false }));
        });
    };

    function connectionPopup(peerName: string, peerId: string) {
        toast(
            ({ closeToast }) => (
                <div className="flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                            {peerName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1">
                            <p className="font-semibold text-gray-900 text-sm">
                                Connection Request
                            </p>
                            <p className="text-gray-600 text-sm mt-1">
                                Connect with <span className="font-semibold text-indigo-600">{peerName}</span>?
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                closeToast();
                                // confirmConnection();
                            }}
                            className="flex-1 px-4 py-2 bg-linear-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-lg transition-all duration-200 hover:shadow-lg"
                        >
                            ✓ Accept
                        </button>
                        <button
                            onClick={() => {
                                closeToast();
                            }}
                            className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition-all duration-200"
                        >
                            ✗ Deny
                        </button>
                    </div>
                </div>
            ),
            {
                position: "top-center",
                autoClose: false,
                closeOnClick: false,
                closeButton: false,
                draggable: false,
            }
        );
    }

    function handleVisibilityChange(visible: boolean) {
        if (!socket) return;
        setConfig((prev) => ({ ...prev, isLoadingVisibility: true }));
        socket.queueMsg({ id: (Math.random() * 10000).toString(), type: "VISIBILITY", data: { visible } }).then((msg) => {
            setConfig({ ...config, publicVisibility: (msg.data as VisibilityAckPayload).visible, isLoadingVisibility: false });
        })
    }

    function sendConnReq() {
        if (!socket) return;
        if (!config.peerId) {
            toast.error("Please provide peerId")
        }
        if (!config.peerId) {
            setError('Please enter a connection code or select peer from the public list');
            return;
        }
        socket.queueMsg({
            id: (Math.random() * 10000).toString(),
            type: 'OFFER',
            data: {
                targetId: config.peerId,
                password: config.peerPass,
                offer: ''
            }
        })
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setConfig((prev) => ({ ...prev, peerId: e.target.value }));
        setError('');
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 lg:p-6">
            <div className="w-full max-w-3xl mx-auto">
                <div className="flex items-center">

                    {/* Left Side - Public Peers List */}
                    {socket && <div className="order-1 lg:order-2 w-full">
                        <div className="bg-white rounded-3xl shadow-2xl p-6 space-y-5 transform transition-all duration-300 hover:shadow-3xl h-full flex flex-col w-full min-h-[560px]">
                            {/* Header to match right card */}
                            <div className="text-center space-y-2.5">
                                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-linear-to-br from-purple-500 to-indigo-600 shadow-lg mx-auto">
                                    <svg
                                        className="w-8 h-8 text-white"
                                        fill="none"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <h2 className="text-3xl font-bold bg-linear-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                                    Available Peers
                                </h2>
                                <p className="text-gray-600 text-base">
                                    Choose from list or connect via code
                                </p>
                            </div>

                            {/* Controls */}
                            <div className="flex items-center justify-between">
                                <div className='flex items-center gap-2'>
                                    <label className="text-sm text-gray-700">Publicly Visible?</label>
                                    {config.isLoadingVisibility ? (
                                        <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                                    ) : (
                                        <Switch
                                            checked={config.publicVisibility}
                                            onCheckedChange={(checked) => {
                                                handleVisibilityChange(checked);
                                            }}
                                        />
                                    )}
                                </div>
                                <button
                                    onClick={() => fetchPeers()}
                                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                                    title="Refresh peers"
                                >
                                    <TfiReload className={`w-5 h-5 mx-auto text-gray-300 cursor-pointer ${config.isLoadingPeers ? 'animate-spin' : ''}`} color='black' />
                                </button>
                            </div>

                            {config.isLoadingPeers ? (
                                <div className="space-y-2.5">
                                    {[...Array(2)].map((_, i) => (
                                        <div
                                            key={i}
                                            className="animate-pulse flex items-center gap-3 p-3 bg-gray-100 rounded-xl"
                                        >
                                            <div className="w-10 h-10 bg-gray-300 rounded-full" />
                                            <div className="flex-1 space-y-2">
                                                <div className="h-3 bg-gray-300 rounded w-3/4" />
                                                <div className="h-2 bg-gray-300 rounded w-1/2" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : publicPeers.length === 0 ? (
                                <div className="text-center py-8">
                                    <FaPeopleGroup className="w-14 h-14 mx-auto text-gray-300 mb-3 cursor-pointer" color='black' />
                                    <p className="text-gray-500">No peers available</p>
                                </div>
                            ) : (
                                <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-2">
                                    {publicPeers.map((peer) => (
                                        <div
                                            key={peer.id}
                                            className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all duration-200 group cursor-pointer border-2 border-transparent hover:border-indigo-200"
                                            onClick={() => setConfig({ ...config, peerId: peer.id })}
                                        >
                                            {/* Avatar */}
                                            <div className="relative">
                                                <div className="w-10 h-10 rounded-full bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-base">
                                                    {peer.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                                </div>
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-gray-900 truncate">
                                                    {peer.name}
                                                </h3>
                                            </div>

                                            {/* Connect Button */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setConfig({ ...config, peerId: peer.id });
                                                }}
                                                disabled={config.connectionStatus < ConnectionStatus.Connected && config.connectingPeer?.id === peer.id}
                                                className={`px-3 py-1.5 rounded-lg font-semibold text-sm transition-all duration-200
                        ${config.connectionStatus === ConnectionStatus.Connecting && config.connectingPeer?.id === peer.id
                                                        ? 'bg-gray-300 text-gray-500 cursor-wait'
                                                        : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-lg group-hover:scale-105'
                                                    }
                      `}
                                            >
                                                {config.connectionStatus < ConnectionStatus.Connected && config.connectingPeer?.id === peer.id ? (
                                                    <span className="flex items-center gap-2">
                                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                                            <circle
                                                                className="opacity-25"
                                                                cx="12"
                                                                cy="12"
                                                                r="10"
                                                                stroke="currentColor"
                                                                strokeWidth="4"
                                                                fill="none"
                                                            />
                                                            <path
                                                                className="opacity-75"
                                                                fill="currentColor"
                                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                            />
                                                        </svg>
                                                    </span>
                                                ) : (
                                                    'Connect'
                                                )}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Manual Connection Section */}
                            <div className="mt-4 space-y-2">
                                <label
                                    htmlFor="peerIdLeft"
                                    className="block text-sm font-semibold text-gray-700"
                                >
                                    Connection Code
                                </label>
                                <input
                                    id="peerIdLeft"
                                    type="text"
                                    value={config.peerId}
                                    onChange={handleInputChange}
                                    placeholder="Enter code..."
                                    className={`w-full px-3.5 py-2.5 rounded-xl border-2 transition-all duration-200 outline-none
                                        ${error ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-100' : 'border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100'}
                                        text-gray-900 placeholder-gray-400 text-base font-medium
                                    `}
                                />
                                <label
                                    htmlFor="peerPin"
                                    className="block text-sm font-semibold text-gray-700"
                                >
                                    Peer's Pin
                                </label>
                                <input
                                    id="peerPin"
                                    type="password"
                                    value={config.peerPass}
                                    onChange={(e) => setConfig({ ...config, peerPass: e.target.value })}
                                    placeholder="Enter peer's pin..."
                                    className={`w-full px-3.5 py-2.5 rounded-xl border-2 transition-all duration-200 outline-none
                                        ${error ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-100' : 'border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100'}
                                        text-gray-900 placeholder-gray-400 text-base font-medium
                                    `}
                                />
                                {error && (
                                    <p className="text-red-500 text-sm font-medium flex items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-200">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                        {error}
                                    </p>
                                )}
                                <button
                                    onClick={() => sendConnReq()}
                                    disabled={!socket || !config.peerId.trim() || !config.peerPass.trim()}
                                    className={`w-full py-2.5 rounded-xl font-semibold text-sm shadow-lg transition-all duration-200
                                        ${!socket || !config.peerId.trim() || !config.peerPass.trim()
                                            ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                                            : 'bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]'}
                                    `}
                                >
                                    Connect Now
                                </button>
                            </div>
                        </div>
                    </div>}

                    {!socket && <div className="order-1 lg:order-2 w-full">
                        {/* Main Card */}
                        <div className="bg-white rounded-3xl shadow-2xl p-6 space-y-5 transform transition-all duration-300 hover:shadow-3xl h-full flex flex-col justify-center w-full min-h-[560px]">
                            {/* Header */}
                            <div className="text-center space-y-2.5">
                                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-linear-to-br from-purple-500 to-indigo-600 shadow-lg mb-1.5">
                                    <svg
                                        className="w-8 h-8 text-white"
                                        fill="none"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <h1 className="text-3xl font-bold bg-linear-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                                    Lovely Share
                                </h1>
                                <p className="text-gray-600 text-base">
                                    Connect with your partner to start sharing
                                </p>
                            </div>

                            {/* Initial Connection Form */}
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label
                                        htmlFor="displayName"
                                        className="block text-sm font-semibold text-gray-700"
                                    >
                                        Your Display Name <span className="text-red-500">*</span>
                                    </label>
                                    <div className='flex items-center gap-2'>
                                        <input
                                            id="displayName"
                                            type="text"
                                            value={config.displayName}
                                            onChange={(e) => {
                                                setConfig({ ...config, displayName: e.target.value });
                                                setError('');
                                            }}
                                            placeholder="Enter your name..."
                                            required
                                            disabled={!!socket}
                                            className={`flex-1 px-3.5 py-2.5 rounded-xl border-2 transition-all duration-200 outline-none
                                                            ${error && !config.displayName.trim()
                                                    ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                                                    : 'border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100'
                                                }
                                                disabled:bg-gray-50 disabled:cursor-not-allowed
                                                text-gray-900 placeholder-gray-400
                                                text-base font-medium
                                                `} />
                                    </div>
                                </div>

                                {/* Password Field */}
                                <div className="space-y-2">
                                    <label
                                        htmlFor="password"
                                        className="block text-sm font-semibold text-gray-700"
                                    >
                                        Password <span className="text-red-500">*</span>
                                    </label>
                                    <div className='flex items-center gap-2'>
                                        <input
                                            id="password"
                                            type="password"
                                            value={config.password}
                                            onChange={(e) => {
                                                setConfig({ ...config, password: e.target.value });
                                                setError('');
                                            }}
                                            placeholder="Set a session password..."
                                            required
                                            disabled={!!socket}
                                            className={`flex-1 px-3.5 py-2.5 rounded-xl border-2 transition-all duration-200 outline-none
                                                ${error && !config.password.trim() ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-100' : 'border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100'}
                                                disabled:bg-gray-50 disabled:cursor-not-allowed
                                                text-gray-900 placeholder-gray-400
                                                text-base font-medium
                                            `}
                                        />
                                        {/* Init socket button - compact placement next to password */}
                                        {socket === null && config.displayName.trim() && config.password.trim() ? (
                                            <button
                                                title="Initialize"
                                                aria-label="Initialize connection"
                                                className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-linear-to-r from-purple-600 to-indigo-600 text-white shadow-md hover:shadow-lg hover:from-purple-700 hover:to-indigo-700 transition-all"
                                                onClick={() => {
                                                    if (socket !== null) return;
                                                    if (!config.displayName.trim()) {
                                                        setError('Please enter your display name');
                                                        return;
                                                    }
                                                    if (!config.password.trim()) {
                                                        setError('Please set a password');
                                                        return;
                                                    }
                                                    setConfig((prev) => ({ ...prev, password: config.password }));
                                                    onInit(config.displayName.trim(), config.password);
                                                    fetchPeers();
                                                }}
                                            >
                                                <PiPlugsConnectedThin size={20} />
                                            </button>
                                        ) : null}
                                    </div>
                                </div>

                            </div>

                            {/* Info Section */}
                            <div className="pt-4 border-t border-gray-100">
                                <div className="flex items-start gap-3 p-4 bg-indigo-50 rounded-xl">
                                    <svg
                                        className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                    <div className="text-sm text-indigo-900">
                                        <p className="font-semibold mb-1">Quick tip</p>
                                        <p className="text-indigo-700">
                                            Enter your display name and password, connect to initialize, then pick a peer or use a connection code from the left panel for secure P2P sharing.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>}

                </div>

                {/* Footer */}
                <p className="text-center text-gray-500 text-sm mt-6">
                    Secure • Fast • Private
                </p>
            </div>
        </div>
    );
}