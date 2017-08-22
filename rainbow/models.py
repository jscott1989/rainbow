from django.db import models
from django.contrib.postgres.fields import JSONField


class World(models.Model):
    state = JSONField()


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
    color = models.CharField(max_length=7)
    state = JSONField()

    def add_item(self, item):
        if "items" not in self.state:
            self.state["items"] = {}

        self.state["items"][item["id"]] = item

    def data(self):
        return {
            "id": self.player_id,
            "x": self.x,
            "y": self.y,
            "color": self.color,
            "state": self.state
        }
