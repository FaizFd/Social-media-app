import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Carousel from 'react-bootstrap/Carousel';
import Header from './Header';
import Sidebar from './Sidebar';
import RightSidebar from './RightSidebar';
import '../styles/Profile.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { token, apiBaseUrl } from '../constants';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart as faHeartSolid } from '@fortawesome/free-solid-svg-icons';
import { faHeart as faHeartRegular } from '@fortawesome/free-regular-svg-icons';
import NotificationFollowed from './NotificationFollowed';

interface ProfileData {
  profilePicture: string;
  followers: number;
  following: number;
}

interface Post {
  _id: string;
  content: string;
  images: string[];
  likes: string[]; // assuming likes are an array of user IDs
  author: {
    username: string;
    profilePicture: string;
  };
  isLikedByCurrentUser: boolean;
}

const Profile: React.FC = () => {
  const { username } = useParams<{ username?: string }>();
  const navigate = useNavigate();
  
  const [profileData, setProfileData] = useState<ProfileData>({
    profilePicture: '',
    followers: 0,
    following: 0,
  });
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [error, setError] = useState<string>('');
  const [isCurrentUser, setIsCurrentUser] = useState<boolean>(false);
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [profileNotFound, setProfileNotFound] = useState<boolean>(false);
  const [notification, setNotification] = useState<string>('');
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);

  useEffect(() => {
    if (!token) {
      setError('You need to log in to view profiles.');
      return;
    }

    const fetchProfileData = async () => {
      try {
        const res = await axios.get(`${apiBaseUrl}/auth/profile/${username}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.data.message === 'User not found') {
          setProfileNotFound(true);
        } else {
          setProfileData(res.data);

          const currentUser = localStorage.getItem('username');
          setIsCurrentUser(currentUser === username);

          const followingRes = await axios.get(`${apiBaseUrl}/auth/is-following/${username}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          setIsFollowing(followingRes.data.isFollowing);

          const postsRes = await axios.get(`${apiBaseUrl}/posts/user/${username}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          const likedPosts = JSON.parse(localStorage.getItem('likedPosts') || '') || {};
          const updatedPosts = postsRes.data.map((post: Post) => ({
            ...post,
            isLikedByCurrentUser: likedPosts[post._id] || false,
          }));

          setPosts(updatedPosts);
        }
      } catch (err) {
        console.error(err);
        setError('Error fetching profile data');
      }
    };

    if (username) fetchProfileData();
  }, [username]);

  const handleFollow = async () => {
    try {
      await axios.post(`${apiBaseUrl}/auth/follow/${username}`, null, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setIsFollowing(true);
      setProfileData(prevData => ({ ...prevData, followers: prevData.followers + 1 }));
      setNotification('Followed');
    } catch (err) {
      console.error('Error following user:', err);
      setError('Error following user');
    }
  };

  const handleUnfollow = () => {
    // Show the confirmation UI here
    setShowConfirmation(true);
  };

  const confirmUnfollow = async () => {
    try {
      await axios.post(`${apiBaseUrl}/auth/unfollow/${username}`, null, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setIsFollowing(false);
      setProfileData(prevData => ({ ...prevData, followers: prevData.followers - 1 }));
      setNotification('Unfollowed');
    } catch (err) {
      console.error('Error unfollowing user:', err);
      setError('Error unfollowing user');
    }
    setShowConfirmation(false);
  };

  const cancelUnfollow = () => {
    setShowConfirmation(false);
  };

  const handlePostNavigation = (postId: string) => {
    navigate(`/post/${postId}`);
  };

  const handleProfileNavigation = (username: string) => {
    navigate(`/profile/${username}`);
  };

  const handleLike = async (postId: string, liked: boolean) => {
    try {
      const url = liked
        ? `${apiBaseUrl}/posts/unlike/${postId}`
        : `${apiBaseUrl}/posts/like/${postId}`;

      const response = await axios.post(url, {}, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setPosts(posts.map(post => {
        if (post._id === postId) {
          return {
            ...post,
            likes: response.data.likes,
            isLikedByCurrentUser: !liked,
          };
        }
        return post;
      }));

      const likedPosts = JSON.parse(localStorage.getItem('likedPosts') || '') || {};
      likedPosts[postId] = !liked;
      localStorage.setItem('likedPosts', JSON.stringify(likedPosts));
    } catch (err) {
      console.error('Error liking/unliking post:', err);
      setError('Error updating like');
    }
  };

  return (
    <div className="profile-container">
      {error ? (
        <p>{error}</p>
      ) : profileNotFound ? (
        <p>The person you searched for does not exist.</p>
      ) : (
        <>
          <Header
            handleLogout={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('username');
              navigate('/login');
            }} 
          />
          <Sidebar />
          <div className="profile-content">
            <div className="profile-picture-container">
              <img src={profileData.profilePicture} alt="Profile" className="profile-picture2" />
              <h2 className="username2">{username}</h2>
            </div>
            <div className="profile-info">
              <div className="profile-stats">
                <div className='followers-count'>
                  <span>{profileData.followers}</span>
                  <span>Followers</span>
                </div>
                <div>
                  <span>{profileData.following}</span>
                  <span>Following</span>
                </div>
              </div>
              {!isCurrentUser && (
                <div className="profile-actions">
                  {isFollowing ? (
                    <button className="follow-button" onClick={handleUnfollow}>Unfollow</button>
                  ) : (
                    <button className="follow-button" onClick={handleFollow}>Follow</button>
                  )}
                  {notification && (
                    <NotificationFollowed
                      message={notification}
                      onClose={() => setNotification('')}
                    />
                  )}
                </div>
              )}
            </div>

            <div className="user-posts">
              <h3>{username}'s Posts</h3>
              {posts.length === 0 ? (
                <p>This user hasn't posted anything yet.</p>
              ) : (
                posts.map(post => (
                  <div 
                    key={post._id} 
                    className="post-card" 
                    style={{ minWidth: '100%' }}
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (!target.classList.contains('post-image')) {
                        handlePostNavigation(post._id);
                      }
                    }}
                    >
                    <div className="post-header">
                      <img 
                        src={post.author.profilePicture} 
                        alt="Profile" 
                        className="profile-picture" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleProfileNavigation(post.author.username);
                        }}
                      />
                      <span 
                        className="post-author" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleProfileNavigation(post.author.username);
                        }}
                      >
                        {post.author.username}
                      </span>
                    </div>
                    <p className="post-content">{post.content}</p>
                    {post.images.length > 1 ? (
                      <Carousel className="post-carousel" onClick={(e) => e.stopPropagation()}>
                        {post.images.map((image, index) => (
                          <Carousel.Item key={index}>
                            <img src={image} alt="Post" className="post-image" />
                          </Carousel.Item>
                        ))}
                      </Carousel>
                    ) : post.images.length === 1 ? (
                      <img
                        src={post.images[0]}
                        alt="Post"
                        className="post-image"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : null}
                    <div className="post-actions">
                      <FontAwesomeIcon
                        icon={post.isLikedByCurrentUser ? faHeartSolid : faHeartRegular}
                        className="like-icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLike(post._id, post.isLikedByCurrentUser);
                        }}
                      />
                      <span>{post.likes.length}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <RightSidebar />
        </>
      )}

      {showConfirmation && (
        <div className="confirmation-overlay">
          <div className="confirmation-modal">
            <p>Are you sure you want to unfollow?</p>
            <button onClick={confirmUnfollow}>Yes</button>
            <button onClick={cancelUnfollow}>No</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
