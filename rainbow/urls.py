from django.conf.urls import url
from rainbow.views import index


urlpatterns = [
    url(r'^$', index, name="index"),
]
