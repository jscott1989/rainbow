# -*- coding: utf-8 -*-
# Generated by Django 1.11.4 on 2017-08-20 09:47
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('rainbow', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='player',
            name='enabled',
            field=models.BooleanField(default=False),
            preserve_default=False,
        ),
    ]
