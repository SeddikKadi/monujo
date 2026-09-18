require "net/http"
require "openssl"
require "stringio"
require "uri"

module SpaceshipServiceKeyFallback
  ACCOUNT_URI = URI("https://developer.apple.com/account")
  MAX_REDIRECTS = 3
  OPEN_TIMEOUT = 5
  READ_TIMEOUT = 10
  WRITE_TIMEOUT = 10
  PRIMARY_OUTPUT_MUTEX = Mutex.new

  class Error < StandardError; end
  class MissingWidgetKeyError < Error; end
  class MalformedWidgetKeyError < Error; end
  class AmbiguousWidgetKeyError < Error; end
  class AccountPageHTTPError < Error; end
  class UnsafeRedirectError < Error; end
  class TooManyRedirectsError < Error; end
  class AccountPageNetworkError < Error; end

  def self.install!
    return if Spaceship::Client.ancestors.include?(self)

    Spaceship::Client.prepend(self)
  end

  def itc_service_key
    primary_error = nil
    primary_key = nil

    begin
      primary_key = spaceship_service_key_from_primary { super }
    rescue Spaceship::AppleTimeoutError => error
      primary_error = spaceship_service_key_sanitized_error(error)
    end

    return primary_key if spaceship_service_key_present?(primary_key)

    begin
      @service_key = spaceship_service_key_from_account
    rescue Error => error
      raise error, cause: primary_error if primary_error

      raise
    end
  end

  private

  def spaceship_service_key_from_primary
    PRIMARY_OUTPUT_MUTEX.synchronize do
      previous_stdout = $stdout
      $stdout = StringIO.new
      begin
        yield
      ensure
        $stdout = previous_stdout
      end
    end
  end

  def spaceship_service_key_present?(key)
    key.is_a?(String) && !key.empty?
  end

  def spaceship_service_key_sanitized_error(error)
    sanitized = error.class.new("Primary service-key lookup failed")
    sanitized.set_backtrace(error.backtrace)
    sanitized
  rescue ArgumentError
    sanitized = StandardError.new("Primary service-key lookup failed")
    sanitized.set_backtrace(error.backtrace)
    sanitized
  end

  def spaceship_service_key_from_account(uri = ACCOUNT_URI, redirects = 0)
    response = spaceship_service_key_http_get(uri)
    status = response.code.to_i

    if status.between?(200, 299)
      return spaceship_service_key_extract_widget_key(response.body.to_s)
    end

    if status.between?(300, 399)
      raise TooManyRedirectsError, "Apple account page redirected too many times" if redirects >= MAX_REDIRECTS

      location = response["location"]
      raise UnsafeRedirectError, "Apple account page redirect has no location" if location.to_s.empty?

      redirected_uri = spaceship_service_key_redirect_uri(uri, location)
      return spaceship_service_key_from_account(redirected_uri, redirects + 1)
    end

    raise AccountPageHTTPError, "Apple account page returned HTTP #{status}"
  end

  def spaceship_service_key_redirect_uri(uri, location)
    redirected_uri = URI.join(uri.to_s, location)
    hostname = redirected_uri.hostname.to_s.downcase
    apple_hostname = hostname == "apple.com" || hostname.end_with?(".apple.com")

    unless redirected_uri.scheme == "https" && apple_hostname
      raise UnsafeRedirectError, "Apple account page redirected outside verified Apple HTTPS"
    end

    redirected_uri
  rescue URI::InvalidURIError
    raise UnsafeRedirectError, "Apple account page returned an invalid redirect"
  end

  def spaceship_service_key_extract_widget_key(body)
    field_count = body.scan(/["']widgetKey["']\s*:/).length
    raise MissingWidgetKeyError, "Apple account page has no widgetKey field" if field_count.zero?
    if field_count > 1
      raise AmbiguousWidgetKeyError, "Apple account page has multiple widgetKey fields"
    end

    match = body.match(/["']widgetKey["']\s*:\s*["']([^"']*)["']/)
    key = match && match[1]
    unless key&.match?(/\A[0-9a-fA-F]{32,64}\z/)
      raise MalformedWidgetKeyError, "Apple account page has a malformed widgetKey field"
    end

    key
  end

  def spaceship_service_key_http_get(uri)
    http = spaceship_service_key_http_client(uri)
    request = Net::HTTP::Get.new(uri.request_uri)
    request["Accept"] = "text/html"
    request["User-Agent"] = "fastlane-spaceship-service-key-fallback"
    http.request(request)
  rescue Timeout::Error, SocketError, SystemCallError, OpenSSL::SSL::SSLError => error
    sanitized = StandardError.new("Apple account request transport failed (#{error.class})")
    sanitized.set_backtrace(error.backtrace)
    raise AccountPageNetworkError, "Apple account page request failed", cause: sanitized
  end

  def spaceship_service_key_http_client(uri)
    Net::HTTP.new(uri.hostname, uri.port).tap do |http|
      http.use_ssl = true
      http.verify_mode = OpenSSL::SSL::VERIFY_PEER
      http.open_timeout = OPEN_TIMEOUT
      http.read_timeout = READ_TIMEOUT
      http.write_timeout = WRITE_TIMEOUT if http.respond_to?(:write_timeout=)
    end
  end
end
