import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, ThumbsUp, Send, Filter, Plus, X, Mail, LogOut } from 'lucide-react';
// --- FIREBASE IMPORTS ---
import { db, auth } from './firebase';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  arrayUnion,
  increment,
  serverTimestamp,
  where,
  setDoc
} from "firebase/firestore";
import {
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut
} from "firebase/auth";

// --- NAME GENERATOR UTILITY ---
const generateRandomUsername = () => {
  const adjectives = [
    "Silent", "Cosmic", "Velvet", "Rapid", "Brave", "Clever", "Misty", "Grand",
    "Shiny", "Happy", "Urban", "Wild", "Jolly", "Ancient", "Future", "Hidden",
    "Lucky", "Noble", "Quiet", "Swift", "Witty", "Calm", "Eager", "Fancy",
    "Gentle", "Heavy", "Iron", "Jumping", "Keen", "Lazy", "Magic", "Neon",
    "Odd", "Proud", "Quick", "Royal", "Super", "Tiny", "Vivid", "Wise"
  ];

  const nouns = [
    "Fox", "Owl", "Panda", "Tiger", "Falcon", "Badger", "Wolf", "Eagle",
    "Bear", "Shark", "Hawk", "Lion", "Ninja", "Samurai", "Wizard", "Knight",
    "Ghost", "Shadow", "Echo", "Spark", "Flame", "Star", "Moon", "Sun",
    "Planet", "Comet", "Rocket", "Pilot", "Racer", "Dream", "Cloud", "River",
    "Ocean", "Forest", "Mountain", "Valley", "Canyon", "Desert", "Island", "Storm"
  ];

  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 1000); // 0-999 unique suffix

  return `${adj}-${noun}-${num}`;
};

export default function AnonyMate() {
  const [posts, setPosts] = useState([]);
  const [showNewPost, setShowNewPost] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [newPost, setNewPost] = useState({ title: '', content: '', category: 'academic' });
  const [replyingTo, setReplyingTo] = useState(null);
  const [viewRepliesFor, setViewRepliesFor] = useState(null);
  const [replyContent, setReplyContent] = useState('');

  // --- AUTH STATES ---
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // --- ANONYMITY STATE: Persistent Username ---
  const [username, setUsername] = useState('');

  const [userReactions, setUserReactions] = useState({});

  // --- Chat State ---
  const [chatWith, setChatWith] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);

  // --- Inbox State ---
  const [showInbox, setShowInbox] = useState(false);
  const [conversations, setConversations] = useState([]);

  // REQUIRED DOMAIN FOR ACCESS
  const REQUIRED_DOMAIN = '@goa.bits-pilani.ac.in';

  const categories = [
    { id: 'all', label: 'All Posts', color: 'bg-gray-100' },
    { id: 'academic', label: 'Academic', color: 'bg-blue-100' },
    { id: 'mental-health', label: 'Mental Health', color: 'bg-green-100' },
    { id: 'social', label: 'Social Life', color: 'bg-purple-100' },
    { id: 'career', label: 'Career & Future', color: 'bg-orange-100' },
  ];

  const reactions = [
    { id: 'support', emoji: '💖', label: 'Support' },
    { id: 'hug', emoji: '😭', label: 'cry' },
    { id: 'agree', emoji: '👍', label: 'Agree' },
  ];

  // --- AUTHENTICATION AND ANONYMOUS USERNAME LOGIC ---
  useEffect(() => {
    // 1. Setup Firebase Auth Listener
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });

    // 2. Setup Persistent Anonymous Username
    let storedUser = localStorage.getItem('anonymateUser');

    // If it is the old format, we want to regenerate it to the new Cool-Name format.
    const isOldFormat = storedUser && storedUser.startsWith('Anon') && !storedUser.includes('-');

    if (storedUser && !isOldFormat) {
      setUsername(storedUser);
    } else {
      // Generate a new Classy username
      const newUser = generateRandomUsername();
      localStorage.setItem('anonymateUser', newUser);
      setUsername(newUser);
    }

    return () => unsubscribeAuth();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const userEmail = user.email;

      if (!userEmail || !userEmail.endsWith(REQUIRED_DOMAIN)) {
        // REJECT ACCESS
        alert(`Access denied. You must use an email ending with ${REQUIRED_DOMAIN}`);
        await signOut(auth);
        return;
      }

      // ACCESS GRANTED

    } catch (error) {
      console.error("Authentication Error:", error);
      alert("Could not sign in with Google: " + error.message);
    }
  };

  const handleSignOut = () => {
    signOut(auth);
    setShowChat(false);
    setShowInbox(false);
  };

  // --- Fetch posts ---
  useEffect(() => {
    if (!currentUser) return;

    const q = query(collection(db, "posts"), orderBy("timestamp", "desc"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const postsData = [];
      querySnapshot.forEach((doc) => {
        postsData.push({ ...doc.data(), id: doc.id });
      });
      setPosts(postsData);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // --- Fetch user's conversations for Inbox ---
  useEffect(() => {
    if (!username || !currentUser) return;

    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', username),
      orderBy('lastUpdated', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const convos = [];
      snapshot.forEach(doc => convos.push({ id: doc.id, ...doc.data() }));
      setConversations(convos);
    });

    return () => unsubscribe();
  }, [username, currentUser]);

  // --- Fetch messages for the active chat ---
  useEffect(() => {
    if (chatWith?.chatId && currentUser) {
      const messagesCol = collection(db, 'chats', chatWith.chatId, 'messages');
      const q = query(messagesCol, orderBy('timestamp', 'asc'));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const messages = [];
        snapshot.forEach(doc => messages.push({ id: doc.id, ...doc.data() }));
        setChatMessages(messages);
      });

      return () => unsubscribe();
    }
  }, [chatWith?.chatId, currentUser]);


  // --- CREATE POST ---
  const handleCreatePost = async () => {
    if (!newPost.title.trim() || !newPost.content.trim()) return;

    try {
      await addDoc(collection(db, "posts"), {
        username: username,
        title: newPost.title,
        content: newPost.content,
        category: newPost.category,
        timestamp: serverTimestamp(),
        reactions: { support: 0, hug: 0, agree: 0 },
        replies: []
      });

      setNewPost({ title: '', content: '', category: 'academic' });
      setShowNewPost(false);
    } catch (e) {
      console.error("Error adding document: ", e);
    }
  };

  // --- UPDATE REACTIONS ---
  const handleReact = async (postId, reactionType) => {
    const reactionKey = `${postId}-${username}`;
    const currentReaction = userReactions[reactionKey];

    const postRef = doc(db, "posts", postId);

    setUserReactions(prev => {
      const updated = { ...prev };
      if (currentReaction === reactionType) {
        delete updated[reactionKey];
      } else {
        updated[reactionKey] = reactionType;
      }
      return updated;
    });

    setPosts(posts.map(post => {
      if (post.id === postId) {
        const newReactions = { ...post.reactions };
        if (currentReaction === reactionType) {
          newReactions[reactionType] = Math.max(0, newReactions[reactionType] - 1);
        } else if (currentReaction) {
          newReactions[currentReaction] = Math.max(0, newReactions[currentReaction] - 1);
          newReactions[reactionType] = newReactions[reactionType] + 1;
        } else {
          newReactions[reactionType] = newReactions[reactionType] + 1;
        }
        return { ...post, reactions: newReactions };
      }
      return post;
    }));

    try {
      if (currentReaction === reactionType) {
        await updateDoc(postRef, {
          [`reactions.${reactionType}`]: increment(-1)
        });
      } else if (currentReaction) {
        await updateDoc(postRef, {
          [`reactions.${currentReaction}`]: increment(-1),
          [`reactions.${reactionType}`]: increment(1)
        });
      } else {
        await updateDoc(postRef, {
          [`reactions.${reactionType}`]: increment(1)
        });
      }
    } catch (e) {
      console.error("Error updating reaction: ", e);
    }
  };

  // --- ADD REPLIES ---
  const handleReply = async (postId) => {
    if (!replyContent.trim()) return;

    const postRef = doc(db, "posts", postId);

    const newReply = {
      id: Math.random().toString(36).substr(2, 9),
      username: username,
      content: replyContent,
      timestamp: new Date().toISOString()
    };

    try {
      await updateDoc(postRef, {
        replies: arrayUnion(newReply)
      });

      setReplyContent('');
      setReplyingTo(null);
    } catch (e) {
      console.error("Error adding reply: ", e);
    }
  };

  // --- Chat functions ---
  const handleStartChat = (otherUser) => {
    if (!username || !otherUser || otherUser === username) return;

    const chatId = [username, otherUser].sort().join('_');

    // Mark as read
    const chatRef = doc(db, 'chats', chatId);
    setDoc(chatRef, {
      unread: {
        [username]: false
      }
    }, { merge: true });

    setChatWith({ username: otherUser, chatId: chatId });
    setShowChat(true);
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !chatWith?.chatId) return;

    const { chatId, username: otherUser } = chatWith;

    const newMessage = {
      sender: username,
      content: chatInput,
      timestamp: serverTimestamp()
    };

    await addDoc(collection(db, 'chats', chatId, 'messages'), newMessage);

    await setDoc(doc(db, 'chats', chatId), {
      participants: [username, otherUser],
      lastMessage: chatInput,
      lastUpdated: serverTimestamp(),
      [`unread.${username}`]: false,
      [`unread.${otherUser}`]: true
    }, { merge: true });

    setChatInput('');
  };

  const filteredPosts = selectedCategory === 'all'
    ? posts
    : posts.filter(post => post.category === selectedCategory);

  // --- HELPER FUNCTION FOR TIMESTAMPS ---
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Just now';
    if (typeof timestamp === 'string') return timestamp;

    if (timestamp.seconds) {
      const date = timestamp.toDate();
      const seconds = Math.floor((new Date() - date) / 1000);
      if (seconds < 60) return `${seconds}s ago`;
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `${minutes}m ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}h ago`;
      return date.toLocaleDateString();
    }
    return '...';
  };


  // --- APP GATING LOGIC ---
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-xl font-medium text-gray-700">Checking access...</p>
      </div>
    );
  }

  if (!currentUser) {
    // Sign-In Screen
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
        <div className="bg-white p-10 rounded-xl shadow-2xl text-center max-w-sm">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 mb-4">
            Welcome to AnonyMate
          </h1>
          <p className="text-gray-600 mb-8">
            This platform is restricted to users with an **{REQUIRED_DOMAIN}** email address.
          </p>
          <button
            onClick={signInWithGoogle}
            className="flex items-center justify-center w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition shadow-lg"
          >
            <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" alt="Google Logo" className="w-5 h-5 mr-3 bg-white p-0.5 rounded-full" />
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  // --- MAIN APPLICATION RENDER ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                AnonyMate
              </h1>
              <p className="text-sm text-gray-600 mt-1">Your safe space for peer support</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                {username}
              </span>

              {/* --- Sign Out Button --- */}
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
              >
                <LogOut size={18} />
                Sign Out
              </button>

              {/* --- Inbox Button --- */}
              <button
                onClick={() => setShowInbox(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                <Mail size={18} />
                Inbox
              </button>

              <button
                onClick={() => setShowNewPost(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition"
              >
                <Plus size={18} />
                New Post
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Category Filters */}
        <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${selectedCategory === cat.id
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                : `${cat.color} text-gray-700 hover:shadow`
                }`}
            >
              <Filter size={14} className="inline mr-1" />
              {cat.label}
            </button>
          ))}
        </div>

        {/* Posts Feed */}
        <div className="space-y-4">
          {filteredPosts.map(post => (
            <div key={post.id} className="bg-white rounded-xl shadow-md hover:shadow-lg transition p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full flex items-center justify-center text-white font-bold">
                    {post.username.slice(0, 2)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-800">
                        {post.username}
                      </p>

                      <button
                        onClick={() => {
                          
                          handleStartChat(post.username);
                        }}
                        className="bg-purple-100 px-2 py-1 rounded text-xs text-purple-700"
                      >
                        Chat
                      </button>
                    </div>

                    <p className="text-xs text-gray-500">
                      {formatTimestamp(post.timestamp)}
                    </p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${categories.find(c => c.id === post.category)?.color
                  }`}>
                  {categories.find(c => c.id === post.category)?.label}
                </span>
              </div>

              <h3 className="text-lg font-bold text-gray-900 mb-2">{post.title}</h3>
              <p className="text-gray-700 mb-4">{post.content}</p>

              {/* Reactions */}
              <div className="flex items-center gap-4 mb-4 pb-4 border-b">
                {reactions.map(reaction => {
                  const reactionKey = `${post.id}-${username}`;
                  const isActive = userReactions[reactionKey] === reaction.id;
                  return (
                    <button
                      key={reaction.id}
                      onClick={() => handleReact(post.id, reaction.id)}
                      className={`flex items-center gap-1 px-3 py-1 rounded-full transition ${isActive
                        ? 'bg-purple-200 ring-2 ring-purple-400'
                        : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                    >
                      <span>{reaction.emoji}</span>
                      <span className="text-sm font-medium text-gray-700">
                        {post.reactions[reaction.id]}
                      </span>
                    </button>
                  );
                })}
                <button
                  onClick={() => setViewRepliesFor(viewRepliesFor === post.id ? null : post.id)}
                  className="ml-auto flex items-center gap-1 px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-full transition"
                >
                  <MessageCircle size={16} />
                  <span className="text-sm font-medium">
                    {post.replies.length} {post.replies.length === 1 ? 'Reply' : 'Replies'}
                  </span>
                </button>
              </div>

              {/* Replies Section */}
              {viewRepliesFor === post.id && (
                <div className="space-y-3 mb-3">
                  {post.replies.length > 0 ? (
                    post.replies.map(reply => (
                      <div key={reply.id} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-400 rounded-full flex items-center justify-center text-white text-sm font-bold">
                              {reply.username.slice(0, 2)}
                            </div>
                            <span className="font-semibold text-sm text-gray-800">{reply.username}</span>
                            <span className="text-xs text-gray-500">{formatTimestamp(reply.timestamp)}</span>
                          </div>
                          <button
                            onClick={() => handleStartChat(reply.username)}
                            className="flex items-center gap-1 px-2 py-1 text-xs text-purple-600 hover:bg-purple-50 rounded transition"
                          >
                            <Mail size={12} />
                            Chat
                          </button>
                        </div>
                        <p className="text-sm text-gray-700">{reply.content}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">No replies yet. Be the first to reply!</p>
                  )}

                  {/* Reply Input */}
                  <div className="flex gap-2 mt-3 pt-3 border-t">
                    <input
                      type="text"
                      value={replyingTo === post.id ? replyContent : ''}
                      onChange={(e) => {
                        setReplyContent(e.target.value);
                        setReplyingTo(post.id);
                      }}
                      placeholder="Write a supportive reply..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      onClick={() => handleReply(post.id)}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* New Post Modal */}
      {showNewPost && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Share Anonymously</h2>
              <button onClick={() => setShowNewPost(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={newPost.category}
                  onChange={(e) => setNewPost({ ...newPost, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {categories.slice(1).map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={newPost.title}
                  onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                  placeholder="Give your post a title..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Your thoughts</label>
                <textarea
                  value={newPost.content}
                  onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                  placeholder="Share what's on your mind. You're not alone..."
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCreatePost}
                  className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition"
                >
                  Post Anonymously
                </button>
                <button
                  onClick={() => setShowNewPost(false)}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inbox Modal */}
      {showInbox && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full h-[600px] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-2xl font-bold text-gray-900">Your Inbox</h2>
              <button onClick={() => setShowInbox(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {conversations.length > 0 ? (
                conversations.map(convo => {
                  // Find the *other* user's name
                  const otherUser = convo.participants.find(p => p !== username);
                  const isUnread = convo.unread?.[username] === true;

                  return (
                    <button
                      key={convo.id}
                      onClick={() => {
                        setShowInbox(false);
                        handleStartChat(otherUser);
                      }}
                      className="w-full text-left p-4 border-b hover:bg-gray-50 flex items-center gap-3"
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-blue-400 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {otherUser?.slice(0, 2)}
                      </div>

                      {/* Text: Takes up most space */}
                      <div className="flex-1 overflow-hidden">
                        <p className={`font-semibold text-gray-800 ${isUnread ? 'font-bold' : ''}`}>
                          {otherUser}
                        </p>
                        <p className={`text-sm text-gray-600 truncate ${isUnread ? 'font-bold text-gray-900' : ''}`}>
                          {convo.lastMessage}
                        </p>
                      </div>

                      {/* Right-aligned section */}
                      <div className="flex flex-col items-end flex-shrink-0">
                        <span className="text-xs text-gray-400 mb-1">
                          {formatTimestamp(convo.lastUpdated)}
                        </span>
                        {/* --- Unread Dot --- */}
                        {isUnread && (
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                    </button>
                  );
                })
              ) : (
                <p className="text-center text-gray-500 p-8">You have no messages yet. Start a chat from a post reply!</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Anonymous Chat Modal */}
      {showChat && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full h-[600px] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <div>
                <h3 className="font-bold text-gray-900">Anonymous Chat</h3>
                <p className="text-sm text-gray-600">with {chatWith?.username}</p>
              </div>
              <button onClick={() => setShowChat(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.map((msg, idx) => (
                <div key={msg.id || idx} className={`flex ${msg.sender === username ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs px-4 py-2 rounded-lg ${msg.sender === username
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 text-gray-900'
                    }`}>
                    {msg.sender !== username && (
                      <p className="text-xs font-semibold mb-1">{msg.sender}</p>
                    )}
                    <p className="text-sm">{msg.content}</p>
                    <p className="text-xs text-right mt-1 opacity-70">
                      {formatTimestamp(msg.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={handleSendMessage}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}