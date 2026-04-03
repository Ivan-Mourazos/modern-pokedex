/**
 * Skeleton.jsx — Componentes de carga con animación shimmer
 */
import { motion } from 'framer-motion';

export const SkeletonCard = ({ style }) => (
  <div className="skeleton-card shimmer" style={style}>
    <div className="skeleton-image" />
    <div className="skeleton-text-title" />
    <div className="skeleton-text-subtitle" />
  </div>
);

export const SkeletonGrid = ({ count = 20, style }) => (
  <div className="pokemon-grid" style={style}>
    {[...Array(count)].map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);

export const SkeletonIndexItem = () => (
  <div className="skeleton-index-item shimmer">
    <div className="skeleton-dot" />
    <div className="skeleton-line" />
  </div>
);

export const SkeletonIndexGrid = ({ count = 24 }) => (
  <div className="moves-index-grid">
    {[...Array(count)].map((_, i) => (
      <SkeletonIndexItem key={i} />
    ))}
  </div>
);
