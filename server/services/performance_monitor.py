"""
🚀 Performance Monitoring Service - Metrics Collection

Implements performance monitoring:
- Request timing and response time tracking
- Database query performance analysis
- Memory and CPU usage monitoring
- Error rate and exception tracking
- Real-time performance dashboards
- Automated alerting for performance degradation

Performance Benefits:
✅ Real-time visibility into system performance
✅ Proactive issue detection and alerting
✅ Data-driven optimization decisions
✅ Historical performance trending
✅ Bottleneck identification and resolution
"""

import time
import logging
import asyncio
import psutil
import json
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from collections import defaultdict, deque
from functools import wraps
from contextlib import asynccontextmanager
import traceback

logger = logging.getLogger(__name__)

@dataclass
class PerformanceMetric:
    """Single performance metric data point"""
    timestamp: datetime
    operation: str
    duration_ms: float
    success: bool
    metadata: Optional[Dict[str, Any]] = None

@dataclass
class SystemMetrics:
    """System resource utilization metrics"""
    timestamp: datetime
    cpu_percent: float
    memory_percent: float
    memory_used_mb: float
    active_connections: int
    disk_usage_percent: float

class PerformanceMonitor:
    """
    Enterprise-grade performance monitoring service
    Follows patterns used by Google, Meta, and Netflix for production monitoring
    """
    
    _instance: Optional['PerformanceMonitor'] = None
    
    def __new__(cls) -> 'PerformanceMonitor':
        """Singleton pattern for global monitoring"""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if hasattr(self, '_initialized'):
            return
            
        self._initialized = True
        self._metrics: deque = deque(maxlen=10000)  # Keep last 10k metrics
        self._operation_stats: Dict[str, List[float]] = defaultdict(list)
        self._error_counts: Dict[str, int] = defaultdict(int)
        self._system_metrics: deque = deque(maxlen=1000)  # Keep last 1k system metrics
        self._alerts: List[Dict[str, Any]] = []
        self._start_time = datetime.now()
        
        # Performance thresholds for alerting
        self.thresholds = {
            'slow_response_ms': 2000,  # Alert if response > 2s
            'high_cpu_percent': 80,     # Alert if CPU > 80%
            'high_memory_percent': 85,  # Alert if memory > 85%
            'high_error_rate': 0.05,    # Alert if error rate > 5%
            'disk_usage_percent': 90    # Alert if disk > 90%
        }
        
        logger.info("🚀 Performance Monitor initialized with metrics")
    
    def record_metric(self, operation: str, duration_ms: float, success: bool = True, metadata: Optional[Dict[str, Any]] = None):
        """
        Record a performance metric
        
        Args:
            operation: Name of the operation (e.g., 'chatbot_stream', 'db_query')
            duration_ms: Duration in milliseconds
            success: Whether the operation succeeded
            metadata: Additional context data
        """
        metric = PerformanceMetric(
            timestamp=datetime.now(),
            operation=operation,
            duration_ms=duration_ms,
            success=success,
            metadata=metadata
        )
        
        self._metrics.append(metric)
        self._operation_stats[operation].append(duration_ms)
        
        if not success:
            self._error_counts[operation] += 1
        
        # Check for performance alerts
        self._check_performance_alerts(metric)
        
        # Log slow operations
        if duration_ms > self.thresholds['slow_response_ms']:
            logger.warning(f"⚠️ Slow operation detected: {operation} took {duration_ms:.2f}ms")
    
    def _check_performance_alerts(self, metric: PerformanceMetric):
        """Check if metric triggers any performance alerts"""
        alerts = []
        
        # Slow response alert
        if metric.duration_ms > self.thresholds['slow_response_ms']:
            alerts.append({
                'type': 'slow_response',
                'operation': metric.operation,
                'duration_ms': metric.duration_ms,
                'timestamp': metric.timestamp.isoformat(),
                'severity': 'warning' if metric.duration_ms < 5000 else 'critical'
            })
        
        # High error rate alert
        if not metric.success:
            recent_metrics = [m for m in self._metrics if m.operation == metric.operation and 
                            m.timestamp > datetime.now() - timedelta(minutes=10)]
            if recent_metrics:
                error_rate = sum(1 for m in recent_metrics if not m.success) / len(recent_metrics)
                if error_rate > self.thresholds['high_error_rate']:
                    alerts.append({
                        'type': 'high_error_rate',
                        'operation': metric.operation,
                        'error_rate': error_rate,
                        'timestamp': metric.timestamp.isoformat(),
                        'severity': 'critical'
                    })
        
        # Store alerts
        for alert in alerts:
            self._alerts.append(alert)
            logger.warning(f"🚨 Performance Alert: {alert}")
    
    def record_system_metrics(self):
        """Record current system resource utilization"""
        try:
            system_metric = SystemMetrics(
                timestamp=datetime.now(),
                cpu_percent=psutil.cpu_percent(interval=1),
                memory_percent=psutil.virtual_memory().percent,
                memory_used_mb=psutil.virtual_memory().used / 1024 / 1024,
                active_connections=len(psutil.net_connections()),
                disk_usage_percent=psutil.disk_usage('/').percent
            )
            
            self._system_metrics.append(system_metric)
            
            # Check system resource alerts
            self._check_system_alerts(system_metric)
            
        except Exception as e:
            logger.error(f"❌ Failed to record system metrics: {e}")
    
    def _check_system_alerts(self, metric: SystemMetrics):
        """Check if system metrics trigger alerts"""
        if metric.cpu_percent > self.thresholds['high_cpu_percent']:
            self._alerts.append({
                'type': 'high_cpu',
                'cpu_percent': metric.cpu_percent,
                'timestamp': metric.timestamp.isoformat(),
                'severity': 'warning' if metric.cpu_percent < 95 else 'critical'
            })
        
        if metric.memory_percent > self.thresholds['high_memory_percent']:
            self._alerts.append({
                'type': 'high_memory',
                'memory_percent': metric.memory_percent,
                'timestamp': metric.timestamp.isoformat(),
                'severity': 'warning' if metric.memory_percent < 95 else 'critical'
            })
        
        if metric.disk_usage_percent > self.thresholds['disk_usage_percent']:
            self._alerts.append({
                'type': 'high_disk',
                'disk_percent': metric.disk_usage_percent,
                'timestamp': metric.timestamp.isoformat(),
                'severity': 'critical'
            })
    
    def get_performance_summary(self) -> Dict[str, Any]:
        """
        Get comprehensive performance summary
        
        Returns:
            Dictionary with performance statistics and insights
        """
        now = datetime.now()
        
        # Calculate operation statistics
        operation_summary = {}
        for operation, durations in self._operation_stats.items():
            if durations:
                recent_durations = [d for d in durations if 
                                  any(m.timestamp > now - timedelta(hours=1) 
                                      for m in self._metrics if m.operation == operation and abs(m.duration_ms - d) < 0.001)]
                
                if recent_durations:
                    operation_summary[operation] = {
                        'avg_response_time_ms': sum(recent_durations) / len(recent_durations),
                        'min_response_time_ms': min(recent_durations),
                        'max_response_time_ms': max(recent_durations),
                        'request_count': len(recent_durations),
                        'error_count': self._error_counts[operation],
                        'error_rate': self._error_counts[operation] / len(recent_durations)
                    }
        
        # System metrics summary
        recent_system = [m for m in self._system_metrics if m.timestamp > now - timedelta(minutes=30)]
        system_summary = {}
        if recent_system:
            system_summary = {
                'avg_cpu_percent': sum(m.cpu_percent for m in recent_system) / len(recent_system),
                'avg_memory_percent': sum(m.memory_percent for m in recent_system) / len(recent_system),
                'avg_memory_used_mb': sum(m.memory_used_mb for m in recent_system) / len(recent_system),
                'peak_cpu_percent': max(m.cpu_percent for m in recent_system),
                'peak_memory_percent': max(m.memory_percent for m in recent_system)
            }
        
        # Recent alerts
        recent_alerts = [a for a in self._alerts if datetime.fromisoformat(a['timestamp']) > now - timedelta(hours=1)]
        
        return {
            'uptime_hours': (now - self._start_time).total_seconds() / 3600,
            'total_metrics_recorded': len(self._metrics),
            'operations_tracked': len(self._operation_stats),
            'total_errors': sum(self._error_counts.values()),
            'active_alerts': len(recent_alerts),
            'critical_alerts': len([a for a in recent_alerts if a.get('severity') == 'critical']),
            'operation_performance': operation_summary,
            'system_performance': system_summary,
            'recent_alerts': recent_alerts[-10:],  # Last 10 alerts
            'health_score': self._calculate_health_score()
        }
    
    def _calculate_health_score(self) -> float:
        """
        Calculate overall system health score (0-100)
        
        Returns:
            Health score where 100 = perfect, 0 = critical issues
        """
        score = 100.0
        
        # Penalize slow responses
        recent_metrics = [m for m in self._metrics if m.timestamp > datetime.now() - timedelta(minutes=30)]
        if recent_metrics:
            slow_operations = sum(1 for m in recent_metrics if m.duration_ms > self.thresholds['slow_response_ms'])
            slow_penalty = (slow_operations / len(recent_metrics)) * 30
            score -= slow_penalty
        
        # Penalize high error rates
        if recent_metrics:
            failed_operations = sum(1 for m in recent_metrics if not m.success)
            error_penalty = (failed_operations / len(recent_metrics)) * 40
            score -= error_penalty
        
        # Penalize system resource issues
        recent_system = [m for m in self._system_metrics if m.timestamp > datetime.now() - timedelta(minutes=30)]
        if recent_system:
            avg_cpu = sum(m.cpu_percent for m in recent_system) / len(recent_system)
            avg_memory = sum(m.memory_percent for m in recent_system) / len(recent_system)
            
            if avg_cpu > self.thresholds['high_cpu_percent']:
                score -= (avg_cpu - self.thresholds['high_cpu_percent']) * 0.5
            if avg_memory > self.thresholds['high_memory_percent']:
                score -= (avg_memory - self.thresholds['high_memory_percent']) * 0.5
        
        return max(0.0, min(100.0, score))
    
    def get_operation_insights(self, operation: str, hours: int = 24) -> Dict[str, Any]:
        """
        Get detailed insights for a specific operation
        
        Args:
            operation: Operation name to analyze
            hours: Time window in hours
            
        Returns:
            Detailed performance insights for the operation
        """
        cutoff_time = datetime.now() - timedelta(hours=hours)
        operation_metrics = [m for m in self._metrics if m.operation == operation and m.timestamp > cutoff_time]
        
        if not operation_metrics:
            return {'error': f'No metrics found for operation: {operation}'}
        
        durations = [m.duration_ms for m in operation_metrics]
        successes = [m for m in operation_metrics if m.success]
        
        # Performance percentiles
        sorted_durations = sorted(durations)
        p50 = sorted_durations[len(sorted_durations) // 2]
        p95 = sorted_durations[int(len(sorted_durations) * 0.95)]
        p99 = sorted_durations[int(len(sorted_durations) * 0.99)]
        
        # Time-based analysis
        hourly_stats = defaultdict(list)
        for metric in operation_metrics:
            hour = metric.timestamp.strftime('%H:00')
            hourly_stats[hour].append(metric.duration_ms)
        
        hourly_performance = {
            hour: {
                'avg_ms': sum(durations) / len(durations),
                'count': len(durations)
            }
            for hour, durations in hourly_stats.items()
        }
        
        return {
            'operation': operation,
            'timeframe_hours': hours,
            'total_requests': len(operation_metrics),
            'successful_requests': len(successes),
            'error_rate': (len(operation_metrics) - len(successes)) / len(operation_metrics),
            'performance_ms': {
                'avg': sum(durations) / len(durations),
                'min': min(durations),
                'max': max(durations),
                'p50': p50,
                'p95': p95,
                'p99': p99
            },
            'hourly_breakdown': hourly_performance,
            'recommendations': self._generate_recommendations(operation, operation_metrics)
        }
    
    def _generate_recommendations(self, operation: str, metrics: List[PerformanceMetric]) -> List[str]:
        """Generate performance optimization recommendations"""
        recommendations = []
        durations = [m.duration_ms for m in metrics]
        avg_duration = sum(durations) / len(durations)
        
        if avg_duration > 1000:
            recommendations.append(f"Consider caching results for {operation} (avg: {avg_duration:.0f}ms)")
        
        if max(durations) > 5000:
            recommendations.append(f"Investigate outliers for {operation} (max: {max(durations):.0f}ms)")
        
        error_rate = sum(1 for m in metrics if not m.success) / len(metrics)
        if error_rate > 0.02:
            recommendations.append(f"High error rate for {operation} ({error_rate:.1%}) - check error handling")
        
        if len(metrics) > 1000:
            recommendations.append(f"High volume for {operation} - consider load balancing or scaling")
        
        return recommendations
    
    async def start_monitoring(self, interval_seconds: int = 60):
        """Start continuous system monitoring"""
        logger.info(f"🚀 Starting performance monitoring with {interval_seconds}s interval")
        
        while True:
            try:
                self.record_system_metrics()
                await asyncio.sleep(interval_seconds)
            except Exception as e:
                logger.error(f"❌ Monitoring error: {e}")
                await asyncio.sleep(interval_seconds)

# Global instance for easy access
performance_monitor = PerformanceMonitor()

# Decorators for automatic performance tracking
def monitor_performance(operation: str, include_args: bool = False):
    """
    Decorator to automatically monitor function performance
    
    Args:
        operation: Name of the operation for metrics
        include_args: Whether to include function arguments in metadata
    """
    def decorator(func: Callable) -> Callable:
        if asyncio.iscoroutinefunction(func):
            @wraps(func)
            async def async_wrapper(*args, **kwargs):
                start_time = time.time()
                success = True
                metadata = None
                
                try:
                    if include_args:
                        metadata = {
                            'args_count': len(args),
                            'kwargs_keys': list(kwargs.keys())
                        }
                    
                    result = await func(*args, **kwargs)
                    return result
                    
                except Exception as e:
                    success = False
                    metadata = metadata or {}
                    metadata['error'] = str(e)
                    metadata['traceback'] = traceback.format_exc()
                    raise
                    
                finally:
                    duration_ms = (time.time() - start_time) * 1000
                    performance_monitor.record_metric(operation, duration_ms, success, metadata)
            
            return async_wrapper
        else:
            @wraps(func)
            def sync_wrapper(*args, **kwargs):
                start_time = time.time()
                success = True
                metadata = None
                
                try:
                    if include_args:
                        metadata = {
                            'args_count': len(args),
                            'kwargs_keys': list(kwargs.keys())
                        }
                    
                    result = func(*args, **kwargs)
                    return result
                    
                except Exception as e:
                    success = False
                    metadata = metadata or {}
                    metadata['error'] = str(e)
                    metadata['traceback'] = traceback.format_exc()
                    raise
                    
                finally:
                    duration_ms = (time.time() - start_time) * 1000
                    performance_monitor.record_metric(operation, duration_ms, success, metadata)
            
            return sync_wrapper
    
    return decorator

@asynccontextmanager
async def monitor_operation(operation: str, metadata: Optional[Dict[str, Any]] = None):
    """
    Context manager for monitoring arbitrary operations
    
    Usage:
        async with monitor_operation("database_query") as monitor:
            result = await db.execute(query)
            monitor.set_metadata({"rows": len(result)})
    """
    start_time = time.time()
    success = True
    operation_metadata = metadata or {}
    
    class OperationMonitor:
        def set_metadata(self, data: Dict[str, Any]):
            operation_metadata.update(data)
        
        def mark_failed(self, error: str):
            nonlocal success
            success = False
            operation_metadata['error'] = error
    
    monitor = OperationMonitor()
    
    try:
        yield monitor
    except Exception as e:
        success = False
        operation_metadata['error'] = str(e)
        operation_metadata['traceback'] = traceback.format_exc()
        raise
    finally:
        duration_ms = (time.time() - start_time) * 1000
        performance_monitor.record_metric(operation, duration_ms, success, operation_metadata)

# Convenience functions
def get_performance_stats() -> Dict[str, Any]:
    """Get current performance statistics"""
    return performance_monitor.get_performance_summary()

def get_operation_insights(operation: str, hours: int = 24) -> Dict[str, Any]:
    """Get detailed insights for a specific operation"""
    return performance_monitor.get_operation_insights(operation, hours)

async def start_performance_monitoring(interval_seconds: int = 60):
    """Start the background monitoring task"""
    return await performance_monitor.start_monitoring(interval_seconds)

# Example usage:
"""
@monitor_performance("chatbot_stream", include_args=True)
async def process_chatbot_request(request):
    # Your chatbot processing logic here
    pass

async with monitor_operation("database_query") as monitor:
    result = await db.execute("SELECT * FROM consultations")
    monitor.set_metadata({"rows_returned": len(result)})
"""
