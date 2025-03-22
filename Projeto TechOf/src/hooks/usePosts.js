import { useEffect, useState } from "react";

function usePosts() {
  const [posts, setPosts] = useState([]);

  const fetchPosts = async () => {
    const response = await fetch('https://jsonplaceholder.typicode.com/posts');
    const data = await response.json();

    return data;
  }
  useEffect(() => {
    fetchPosts()
      .then(_posts => setPosts(_posts))
      .catch(error => console.error);
  }, []);

  return [posts, setPosts];
}

export default usePosts;