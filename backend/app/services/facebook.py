import facebook
from typing import Optional, Dict, Any
from app.config import settings
import logging

logger = logging.getLogger(__name__)

class FacebookService:
    def __init__(self):
        self.graph = facebook.GraphAPI(
            access_token=settings.FACEBOOK_PAGE_ACCESS_TOKEN,
            version=settings.FACEBOOK_API_VERSION
        )
    
    def upload_video(
        self,
        video_path: str,
        title: str,
        description: str = "",
        tags: list = None,
        scheduled_publish_time: Optional[int] = None
    ) -> Dict[str, Any]:
        try:
            params = {
                'title': title,
                'description': description,
            }
            
            if tags:
                params['tags'] = ','.join(tags)
            
            if scheduled_publish_time:
                params['scheduled_publish_time'] = scheduled_publish_time
                params['published'] = False
            
            with open(video_path, 'rb') as video_file:
                response = self.graph.put_video(video=video_file, **params)
            
            return {
                'success': True,
                'video_id': response.get('id'),
                'post_id': response.get('post_id')
            }
        except Exception as e:
            logger.error(f"Upload error: {e}")
            return {'success': False, 'error': str(e)}
    
    def get_video_insights(self, video_id: str, metrics: list):
        """Get video analytics"""
        try:
            insights = self.graph.get_object(
                id=f"{video_id}/video_insights",
                metric=','.join(metrics)
            )
            return {'success': True, 'metrics': insights.get('data', [])}
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def post_to_group(self, group_id: str, message: str, video_id: str = None):
        """Cross-post to Facebook group"""
        try:
            params = {'message': message}
            if video_id:
                params['video_id'] = video_id
            
            response = self.graph.put_object(
                parent_object=group_id,
                connection_name="feed",
                **params
            )
            return {'success': True, 'post_id': response.get('id')}
        except Exception as e:
            return {'success': False, 'error': str(e)}

facebook_service = FacebookService()