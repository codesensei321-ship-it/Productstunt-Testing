import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('control_plane', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='proxy',
            name='scheme',
            field=models.CharField(
                choices=[('http', 'HTTP'), ('https', 'HTTPS'), ('socks5', 'SOCKS5')],
                default='http',
                max_length=10,
            ),
        ),
        migrations.AddField(
            model_name='proxy',
            name='proxy_type',
            field=models.CharField(
                choices=[('FREE', 'Free / Shared'), ('ISP', 'Static ISP'), ('RESIDENTIAL', 'Residential Static')],
                default='ISP',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='proxy',
            name='exit_ip',
            field=models.GenericIPAddressField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='proxy',
            name='username',
            field=models.CharField(blank=True, default='', max_length=150),
        ),
        migrations.AlterField(
            model_name='proxy',
            name='password',
            field=models.CharField(blank=True, default='', max_length=150),
        ),
        migrations.AlterField(
            model_name='proxy',
            name='isp',
            field=models.CharField(blank=True, default='Static ISP Proxy', max_length=150),
        ),
        migrations.AlterField(
            model_name='bot',
            name='proxy',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='bots',
                to='control_plane.proxy',
            ),
        ),
        migrations.AddField(
            model_name='bot',
            name='vnc_pid',
            field=models.IntegerField(blank=True, null=True),
        ),
    ]
