import React from 'react';
import styles from './AdminDashboardNew.module.css';

export const DashboardSection = ({ title, subtitle, children, extra }: any) => (
    <div className={styles.sectionContainer}>
        {(title || extra) && (
            <div className={styles.sectionHeader}>
                <div>
                    {title && <h3 className={styles.sectionTitle}>{title}</h3>}
                    {subtitle && <p className={styles.sectionSubtitle}>{subtitle}</p>}
                </div>
                {extra && <div className={styles.sectionExtra}>{extra}</div>}
            </div>
        )}
        <div className={styles.sectionBody}>
            {children}
        </div>
    </div>
);

export const StatCard = ({ label, value, sublabel, icon, color, trend }: any) => {
    return (
        <div className={styles.statCard} style={{ '--card-color': color } as React.CSSProperties}>
            <div className={styles.statHeader}>
                <div className={styles.statIcon} style={{ color: color, backgroundColor: `${color}15` }}>
                    {icon}
                </div>
                {trend !== undefined && (
                    <div className={`${styles.statTrend} ${trend > 0 ? styles.trendUp : styles.trendDown}`}>
                        {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
                    </div>
                )}
            </div>
            <div className={styles.statBody}>
                <div className={styles.statValue}>{value}</div>
                <div className={styles.statLabel}>{label}</div>
            </div>
            {sublabel && (
                <div className={styles.statFooter}>
                    <span className={styles.statSublabel}>{sublabel}</span>
                </div>
            )}
        </div>
    );
};

export const ChartCard = ({ title, subtitle, children, badge }: any) => (
    <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
            <div>
                <h3 className={styles.chartTitle}>{title}</h3>
                {subtitle && <p className={styles.chartSubtitle}>{subtitle}</p>}
            </div>
            {badge && <div className={styles.chartBadge}>{badge}</div>}
        </div>
        <div className={styles.chartBody}>
            {children}
        </div>
    </div>
);

export const QuickActionCard = ({ icon, label, onClick }: any) => (
    <button className={styles.quickActionCard} onClick={onClick}>
        <div className={styles.quickActionIcon}>{icon}</div>
        <span className={styles.quickActionLabel}>{label}</span>
    </button>
);

export const ActivityCard = ({ title, time, type, description }: any) => (
    <div className={styles.activityCard}>
        <div className={`${styles.activityDot} ${styles['activity-' + type]}`}></div>
        <div className={styles.activityContent}>
            <div className={styles.activityHeader}>
                <span className={styles.activityTitle}>{title}</span>
                <span className={styles.activityTime}>{time}</span>
            </div>
            {description && <div className={styles.activityDesc}>{description}</div>}
        </div>
    </div>
);
