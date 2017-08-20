from django.db import models


class Player(models.Model):
    player_id = models.CharField(max_length=255)
    enabled = models.BooleanField()
    x = models.IntegerField()
    y = models.IntegerField()

    def data(self):
        return {
            "id": self.player_id,
            "x": self.x,
            "y": self.y
        }
