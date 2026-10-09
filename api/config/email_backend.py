"""
SES email backend that survives non-ASCII bodies.

django_ses serialises with ``message.message().as_string()``. Django encodes
short UTF-8 bodies as 8bit, and ``as_string()`` then yields surrogate escapes
that crash on ``.encode('utf-8')`` ("surrogates not allowed") — i.e. any email
to someone with an accent or Cyrillic in their name. Quoted-printable is pure
ASCII, so we force it on every message before handing it to django_ses.
"""
from email import charset as email_charset

from django_ses import SESBackend

_QP_UTF8 = email_charset.Charset('utf-8')
_QP_UTF8.body_encoding = email_charset.QP


class QuotedPrintableSESBackend(SESBackend):
    def send_messages(self, email_messages):
        for message in email_messages:
            message.encoding = _QP_UTF8
        return super().send_messages(email_messages)
