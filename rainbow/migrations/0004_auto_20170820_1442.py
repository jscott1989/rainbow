# -*- coding: utf-8 -*-
# Generated by Django 1.11.4 on 2017-08-20 14:42
from __future__ import unicode_literals

import django.contrib.postgres.fields.jsonb
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('rainbow', '0003_auto_20170820_1347'),
    ]

    operations = [
        migrations.AddField(
            model_name='room',
            name='state',
            field=django.contrib.postgres.fields.jsonb.JSONField(default={}),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name='player',
            name='room',
            field=models.ForeignKey(default=1, on_delete=django.db.models.deletion.CASCADE, to='rainbow.Room'),
        ),
    ]
