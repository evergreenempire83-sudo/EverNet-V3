import React from 'react';
import { motion } from 'framer-motion';
import { FaArrowUp, FaArrowDown } from 'react-icons/fa';

const StatsCard = ({
  title,
  value,
  change,
  trend,
  icon: Icon,
  color = 'navy',
  description
}) => {
  const colorClasses = {
    navy: 'bg-navy-primary text-white',
    gold: 'bg-gradient-to-br from-gold-dark to-gold-primary text-navy-primary',
    amber: 'bg-amber-500 text-white',
    emerald: 'bg-emerald-500 text-white',
    red: 'bg-red-500 text-white',
    purple: 'bg-purple-500 text-white',
    blue: 'bg-blue-500 text-white'
  };

  const trendColors = {
    up: 'text-emerald-500',
    down: 'text-red-500'
  };

  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="relative overflow-hidden rounded-2xl shadow-lg group"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
      
      {/* Main Card */}
      <div className={`relative ${colorClasses[color]} p-6`}>
        {/* Icon */}
        <div className="absolute top-4 right-4 opacity-20">
          <Icon className="h-16 w-16" />
        </div>

        {/* Content */}
        <div className="relative z-10">
          <p className="text-sm font-medium opacity-90 mb-1">{title}</p>
          <h3 className="text-3xl font-bold mb-2">{value}</h3>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {trend === 'up' ? (
                <FaArrowUp className={`h-4 w-4 ${trendColors[trend]} mr-1`} />
              ) : (
                <FaArrowDown className={`h-4 w-4 ${trendColors[trend]} mr-1`} />
              )}
              <span className={`text-sm font-medium ${trendColors[trend]}`}>
                {change}
              </span>
              <span className="text-sm opacity-80 ml-1">vs last period</span>
            </div>
          </div>
        </div>

        {/* Animated Bottom Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
      </div>

      {/* Description Tooltip */}
      <div className="absolute -bottom-10 left-0 right-0 bg-gray-900 text-white text-xs p-2 rounded-b-lg opacity-0 group-hover:opacity-100 group-hover:bottom-0 transition-all duration-300 z-20">
        {description}
      </div>
    </motion.div>
  );
};

export const MiniStatsCard = ({ title, value, icon: Icon, color = 'gray' }) => {
  const colorClasses = {
    gray: 'bg-gray-100 text-gray-900',
    navy: 'bg-navy-primary/10 text-navy-primary',
    gold: 'bg-gold-primary/10 text-gold-dark',
    green: 'bg-emerald-100 text-emerald-700',
    red: 'bg-red-100 text-red-700'
  };

  return (
    <div className={`${colorClasses[color]} rounded-xl p-4`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-80">{title}</p>
          <h3 className="text-xl font-bold mt-1">{value}</h3>
        </div>
        {Icon && (
          <div className="p-2 rounded-lg bg-white/50">
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsCard;
