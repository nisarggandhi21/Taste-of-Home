import React from 'react';
import './ProjectCard.scss';
import { useQuery } from '@tanstack/react-query';
import { userService } from '../../services/userService';
import { Link } from 'react-router-dom';

function ProjectCard({ item }) {
  const { isLoading, error, data } = useQuery({
    queryKey: ['user', item.userId],
    queryFn: () => userService.getUser(item.userId),
  });

  return (
    <Link to={`/item/${item._id}`} className="link">
      <div className="projectCard">
        <img src={item.cover} alt="" />
        <div className="info">
          {isLoading ? (
            'loading'
          ) : error ? (
            'error'
          ) : (
            <>
              <img src={data.img || '/img/noavatar.jpg'} alt="" />
              <div className="texts">
                <h2>{item.cat}</h2>
                <span>{data.username}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

export default ProjectCard;
