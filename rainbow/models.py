from django.db import models
from django.contrib.postgres.fields import JSONField


class Room(models.Model):
    name = models.CharField(max_length=255)
    state = JSONField()

    def data(self):
        return {
            "name": self.name,
            "state": self.state
        }


class Player(models.Model):
    player_id = models.CharField(max_length=255)
    enabled = models.BooleanField(default=True)
    room = models.ForeignKey(Room, default=1)
    x = models.IntegerField()
    y = models.IntegerField()

    def data(self):
        return {
            "id": self.player_id,
            "x": self.x,
            "y": self.y
        }
