from unittest import mock

from django.core.mail import EmailMultiAlternatives
from django.test import SimpleTestCase

from config.email_backend import QuotedPrintableSESBackend


class QuotedPrintableSESBackendTests(SimpleTestCase):
    def test_non_ascii_body_serialises_for_ses(self):
        backend = QuotedPrintableSESBackend(
            fail_silently=False, aws_access_key_id='x', aws_secret_access_key='y',
        )
        message = EmailMultiAlternatives('Fermín', 'Hola Fermín', 'a@b.es', ['c@d.es'])
        message.attach_alternative('<p>Марко í</p>', 'text/html')

        connection = mock.Mock()
        connection.send_raw_email.return_value = {'MessageId': '1', 'ResponseMetadata': {'RequestId': 'r'}}
        backend.connection = connection
        backend._update_throttling = mock.Mock()

        self.assertEqual(backend.send_messages([message]), 1)
        raw = connection.send_raw_email.call_args.kwargs['RawMessage']['Data']
        self.assertIn('quoted-printable', raw)
        raw.encode('utf-8')  # the step that used to raise on 8bit bodies
